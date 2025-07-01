import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Dotprompt } from 'dotprompt';
import * as fs from 'fs';
import * as path from 'path';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import { extractEmailContent } from '../utils/extract-email-content';
import { getConfidenceLanguage } from '../utils/get-confidence-language';

// Schemas are now loaded from .prompt files via Dotprompt

export class AIService {
  private dotprompt: Dotprompt;

  constructor() {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    this.dotprompt = new Dotprompt();
  }

  /**
   * Load and process a .prompt file with the Dotprompt library
   */
  private async loadPromptFile(filename: string, variables: Record<string, any>) {
    const filePath = path.join(process.cwd(), 'src', 'prompts', `${filename}.prompt`);
    const promptSource = fs.readFileSync(filePath, 'utf-8');
    
    // Parse the prompt to extract metadata and template
    const parsedPrompt = this.dotprompt.parse(promptSource);
    
    // Render the template with variables
    const renderedPrompt = await this.dotprompt.render(promptSource, { input: variables });
    
    // Extract the model name from metadata
    const modelName = parsedPrompt.model?.split('/')[1] || 'gpt-4o-mini';
    
    // Extract and convert the output schema
    const outputSchema = parsedPrompt.output?.schema;
    let zodSchemaInstance: z.ZodTypeAny;
    
    if (outputSchema) {
      // Convert JSON Schema to Zod using the library
      try {
        const zodSchemaCode = jsonSchemaToZod(outputSchema);
        
        // Evaluate the generated Zod schema code with z in context
        zodSchemaInstance = new Function('z', `return ${zodSchemaCode}`)(z);
      } catch (error) {
        console.error('Error converting JSON Schema to Zod:', error);
        throw new Error(`Failed to convert schema in ${filename}.prompt: ${error}`);
      }
    } else {
      throw new Error(`No output schema defined in ${filename}.prompt`);
    }
    
    // Extract the rendered text from messages
    const promptText = renderedPrompt.messages
      .map(msg => msg.content.map(part => 'text' in part ? part.text : '').join(''))
      .join('\n');
    
    return {
      modelName,
      promptText,
      schema: zodSchemaInstance,
      config: parsedPrompt.config || {}
    };
  }

  /**
   * Process a single email to extract insights about the user using prompt chain
   */
  async processMessage(emailObj: any, userId: string): Promise<{ inferences: any[] }> {
    try {
      // Use fullBody from frontend if available, otherwise extract from email object
      let emailContent: string;
      if (emailObj.fullBody && emailObj.fullBody.trim().length > 0) {
        emailContent = emailObj.fullBody;
        console.log('✅ Using fullBody from frontend');
      } else {
        emailContent = extractEmailContent(emailObj);
        console.log('⚠️ Extracting content from email object (fullBody not available)');
      }
      
      // Extract email date from the email object
      let emailDate: string;
      if (emailObj.internalDate) {
        // Convert Gmail's internalDate (milliseconds) to YYYY-MM-DD format
        emailDate = new Date(parseInt(emailObj.internalDate)).toISOString().split('T')[0];
      } else if (emailObj.payload?.headers) {
        // Try to extract from headers
        const dateHeader = emailObj.payload.headers.find((h: any) => h.name === 'Date');
        if (dateHeader) {
          emailDate = new Date(dateHeader.value).toISOString().split('T')[0];
        } else {
          emailDate = new Date().toISOString().split('T')[0]; // Fallback to today
        }
      } else {
        emailDate = new Date().toISOString().split('T')[0]; // Fallback to today
      }

      // Extract rich metadata for context reasoning
      const headers = emailObj.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const sender = headers.find((h: any) => h.name === 'From')?.value || '';
      const to = headers.find((h: any) => h.name === 'To')?.value || '';
      const cc = headers.find((h: any) => h.name === 'Cc')?.value || '';
      const replyTo = headers.find((h: any) => h.name === 'Reply-To')?.value || '';
      
      // Extract sender domain
      const senderEmailMatch = sender.match(/<([^>]+)>/) || sender.match(/([^\s]+@[^\s]+)/);
      const senderEmail = senderEmailMatch ? senderEmailMatch[1] || senderEmailMatch[0] : sender;
      const senderDomain = senderEmail.includes('@') ? senderEmail.split('@')[1] : 'unknown';

      // Enhanced metadata including recipients and thread info
      const emailMetadata = {
        subject,
        sender,
        senderDomain,
        to,
        cc,
        replyTo,
        threadId: emailObj.threadId,
        emailType: emailObj.emailType || 'inbox'
      };

      // For sent emails, use the existing prompt
      if (emailObj.emailType === 'sent') {
        const todaysDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        const { modelName, promptText, schema, config } = await this.loadPromptFile('extract-insights-sent', {
          emailContent,
          emailDate,
          emailMetadata,
          todaysDate
        });

        const result = await generateObject({
          model: openai(modelName),
          schema,
          prompt: promptText,
          ...config
        });

        return { inferences: result.object.inferences };
      }

      // For received emails, use the new prompt chain
      return await this.processReceivedEmailChain(emailContent, emailDate, emailMetadata);

    } catch (error) {
      console.error('Error in AI processMessage:', error);
      return { inferences: [] };
    }
  }

  /**
   * Process received emails using the classification + specialized extraction chain
   */
  private async processReceivedEmailChain(
    emailContent: string, 
    emailDate: string, 
    emailMetadata: any
  ): Promise<{ inferences: any[] }> {
    try {
      const todaysDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Step 1: Classify the email type
      console.log('🔍 Classifying email type...');
      const { modelName: classifyModel, promptText: classifyPrompt, schema: classifySchema, config: classifyConfig } = 
        await this.loadPromptFile('received/classify-email', {
          emailContent,
          emailDate,
          emailMetadata,
          todaysDate
        });

      const classifyResult = await generateObject({
        model: openai(classifyModel),
        schema: classifySchema,
        prompt: classifyPrompt,
        ...classifyConfig
      });

      const { emailType, confidence, reasoning } = classifyResult.object;
      console.log(`📋 Email classified as: ${emailType} (confidence: ${confidence}) - ${reasoning}`);

      // Step 2: Route to specialized extraction prompt
      const extractPromptMap = {
        'newsletter': 'received/extract-newsletter',
        'service': 'received/extract-service', 
        'personal': 'received/extract-personal',
        'professional': 'received/extract-professional'
      };

      const extractPromptName = extractPromptMap[emailType as keyof typeof extractPromptMap];
      if (!extractPromptName) {
        console.warn(`⚠️ Unknown email type: ${emailType}, skipping extraction`);
        return { inferences: [] };
      }

      console.log(`⚡ Using specialized prompt: ${extractPromptName}`);
      const { modelName: extractModel, promptText: extractPrompt, schema: extractSchema, config: extractConfig } = 
        await this.loadPromptFile(extractPromptName, {
          emailContent,
          emailDate,
          emailMetadata,
          todaysDate
        });

      const extractResult = await generateObject({
        model: openai(extractModel),
        schema: extractSchema,
        prompt: extractPrompt,
        ...extractConfig
      });

      console.log(`✅ Extracted ${extractResult.object.inferences.length} insights using ${emailType} prompt`);
      return { inferences: extractResult.object.inferences };

    } catch (error) {
      console.error('Error in received email chain:', error);
      // Fallback to empty results rather than failing completely
      return { inferences: [] };
    }
  }

  /**
   * Intelligently blend new insights with existing profile content
   */
  async blendProfile({
    category,
    newInsights,
    existingContent,
    userInfo
  }: {
    category: string;
    newInsights: any[];
    existingContent: string | null;
    userInfo: any;
  }): Promise<string> {
    try {
      const todaysDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Convert confidence scores to natural language modifiers (keep for backward compatibility)
      const insightsWithLanguage = newInsights.map(insight => ({
        ...insight,
        confidenceLanguage: getConfidenceLanguage(insight.confidence)
      }));

      // Create boolean flags for each category to avoid needing custom Handlebars helpers
      const categoryFlags = {
        isBasic: category === 'basic',
        isProfessional: category === 'professional', 
        isPersonal: category === 'personal',
        isCommunication: category === 'communication',
        isBehavioral: category === 'behavioral',
        isAccounts: category === 'accounts',
        isRelationships: category === 'relationships',
        isGoals: category === 'goals'
      };

      // Load and render the blend-profile prompt
      const { modelName, promptText, schema, config } = await this.loadPromptFile('blend-profile', {
        category,
        ...categoryFlags,
        newInsights: insightsWithLanguage,
        existingContent,
        userInfo,
        todaysDate
      });

      const result = await generateObject({
        model: openai(modelName),
        schema,
        prompt: promptText,
        ...config
      });

      return result.object.content;

    } catch (error) {
      console.error('Error in AI blendProfile:', error);
      throw error;
    }
  }

  /**
   * Compile all profile files into a comprehensive super profile
   */
  async compileProfile({
    profileFiles,
    userInfo
  }: {
    profileFiles: Record<string, string>;
    userInfo: any;
  }): Promise<string> {
    try {
      const todaysDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Load and render the compile-profile prompt
      const { modelName, promptText, schema, config } = await this.loadPromptFile('compile-profile', {
        profileFiles,
        userInfo,
        todaysDate
      });

      const result = await generateObject({
        model: openai(modelName),
        schema,
        prompt: promptText,
        ...config
      });

      return result.object.content;

    } catch (error) {
      console.error('Error in AI compileProfile:', error);
      throw error;
    }
  }

  /**
   * Analyze profile files to suggest automation opportunities using background agents
   */
  async analyzeAutomation({
    profileFiles,
    userInfo
  }: {
    profileFiles: Record<string, string>;
    userInfo: any;
  }): Promise<string> {
    try {
      const todaysDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Load and render the analyze-automation prompt
      const { modelName, promptText, schema, config } = await this.loadPromptFile('analyze-automation', {
        profileFiles,
        userInfo,
        todaysDate
      });

      const result = await generateObject({
        model: openai(modelName),
        schema,
        prompt: promptText,
        ...config
      });

      return result.object.content;

    } catch (error) {
      console.error('Error in AI analyzeAutomation:', error);
      throw error;
    }
  }


} 