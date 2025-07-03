import { generateObject, generateText } from 'ai';
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
    
    // Configure dotprompt with partials
    const partials = this.loadPartials();
    this.dotprompt = new Dotprompt({
      partials
    });
  }

  /**
   * Load all partials from the partials directory
   */
  private loadPartials(): Record<string, string> {
    const partialsDir = path.join(process.cwd(), 'src', 'prompts', 'partials');
    const partials: Record<string, string> = {};
    
    try {
      const partialFiles = fs.readdirSync(partialsDir);
      
      for (const filename of partialFiles) {
        if (filename.endsWith('.hbs')) {
          const partialName = filename.replace('.hbs', '');
          const partialPath = path.join(partialsDir, filename);
          const partialContent = fs.readFileSync(partialPath, 'utf-8');
          
          partials[partialName] = partialContent;
        }
      }
    } catch (error) {
      console.error('Error loading partials:', error);
    }
    
    return partials;
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
    
    // Create OpenAI model with structured outputs enabled (strict mode)
    const model = openai(modelName, {
      structuredOutputs: true
    });
    
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
      model, // Return the configured model instead of just the name
      promptText,
      schema: zodSchemaInstance,
      config: parsedPrompt.config || {}
    };
  }

  /**
   * Classify an email without extracting insights (lighter operation for fetch time)
   */
  async classifyEmail(emailObj: any): Promise<{ emailType: string; confidence: number; reasoning: string } | null> {
    try {
      // Extract email metadata
      const headers = emailObj.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const to = headers.find((h: any) => h.name === 'To')?.value || '';
      const fromDomain = from.includes('@') ? from.split('@')[1]?.replace(/[<>]/g, '') : 'unknown';

      // Skip classification for sent emails - they don't use the received email classification system
      if (emailObj.emailType === 'sent') {
        return null;
      }

      // Use fullBody from frontend if available, otherwise extract from email object
      const emailContent = emailObj.fullBody || extractEmailContent(emailObj);
      const emailDate = new Date(parseInt(emailObj.internalDate || '0')).toISOString().split('T')[0];
      const todaysDate = new Date().toISOString().split('T')[0];

      const emailMetadata = {
        subject,
        sender: from,
        senderDomain: fromDomain,
        to
      };
      const { model: classifyModel, promptText: classifyPrompt, schema: classifySchema, config: classifyConfig } = 
        await this.loadPromptFile('received/classify-email', {
          emailContent,
          emailDate,
          emailMetadata,
          todaysDate
        });

      const classifyResult = await generateObject({
        model: classifyModel,
        schema: classifySchema,
        prompt: classifyPrompt,
        ...classifyConfig
      });

      const { classification, confidence, reasoning } = classifyResult.object;

      return {
        emailType: classification,
        confidence,
        reasoning
      };

    } catch (error) {
      console.error('Error in email classification:', error);
      return null;
    }
  }

  /**
   * Extract insights from an email WITH classification (new combined method for extract-insights endpoint)
   */
  async extractInsightsWithClassification(emailObj: any, userInfo?: any): Promise<{ insights: any[]; classification: { emailType: string; confidence: number; reasoning: string } | null }> {
    try {
      // Use fullBody from frontend if available, otherwise extract from email object
      let emailContent: string;
      if (emailObj.fullBody && emailObj.fullBody.trim().length > 0) {
        emailContent = emailObj.fullBody;
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

      // For sent emails, use the existing prompt (no classification needed)
      if (emailObj.emailType === 'sent') {
        const todaysDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        const { model, promptText, schema, config } = await this.loadPromptFile('extract-insights-sent', {
          emailContent,
          emailDate,
          emailMetadata,
          todaysDate,
          userInfo
        });

        const result = await generateObject({
          model,
          schema,
          prompt: promptText,
          ...config
        });

        return {
          insights: result.object.inferences,
          classification: null // Sent emails don't use classification
        };
      }

      // For received emails, use the combined classification + extraction approach
      return await this.processReceivedEmailChain(emailContent, emailDate, emailMetadata, userInfo);

    } catch (error) {
      console.error('Error in insight extraction with classification:', error);
      return {
        insights: [],
        classification: null
      };
    }
  }

  /**
   * Extract insights from an email without classification (classification already done at fetch time) 
   * [DEPRECATED - Use extractInsightsWithClassification instead]
   */
  async extractInsights(emailObj: any, userInfo?: any): Promise<any[]> {
    try {
      // Use fullBody from frontend if available, otherwise extract from email object
      let emailContent: string;
      if (emailObj.fullBody && emailObj.fullBody.trim().length > 0) {
        emailContent = emailObj.fullBody;
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
        
        const { model, promptText, schema, config } = await this.loadPromptFile('extract-insights-sent', {
          emailContent,
          emailDate,
          emailMetadata,
          todaysDate,
          userInfo
        });

        const result = await generateObject({
          model,
          schema,
          prompt: promptText,
          ...config
        });

        return result.object.inferences;
      }

      // For received emails, we already have classification from fetch time, so just do extraction
      // Use the email's existing classification to determine which extraction prompt to use
      let extractPromptName = 'received/extract-personal'; // default fallback
      
      if (emailObj.classification?.emailType) {
        const extractPromptMap = {
          'newsletter': 'received/extract-newsletter',
          'service': 'received/extract-service',
          'marketing': 'received/extract-marketing',
          'personal': 'received/extract-personal',
          'professional': 'received/extract-professional'
        };
        extractPromptName = extractPromptMap[emailObj.classification.emailType as keyof typeof extractPromptMap] || 'received/extract-personal';
      }

      console.log(`⚡ Using specialized prompt: ${extractPromptName} (based on existing classification: ${emailObj.classification?.emailType})`);
      const todaysDate = new Date().toISOString().split('T')[0];
      
      const { model: extractModel, promptText: extractPrompt, schema: extractSchema, config: extractConfig } = 
        await this.loadPromptFile(extractPromptName, {
          emailContent,
          emailDate,
          emailMetadata,
          todaysDate,
          userInfo
        });

      const extractResult = await generateObject({
        model: extractModel,
        schema: extractSchema,
        prompt: extractPrompt,
        ...extractConfig
      });
      return extractResult.object.inferences;

    } catch (error) {
      console.error('Error in insight extraction:', error);
      return [];
    }
  }

  /**
   * Process a single email to extract insights about the user using prompt chain (legacy method - includes classification)
   */
  async processMessage(emailObj: any, userId: string): Promise<{ inferences: any[]; classification: { emailType: string; confidence: number; reasoning: string } | null }> {
    try {
      // Use fullBody from frontend if available, otherwise extract from email object
      let emailContent: string;
      if (emailObj.fullBody && emailObj.fullBody.trim().length > 0) {
        emailContent = emailObj.fullBody;
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
        
        const { model, promptText, schema, config } = await this.loadPromptFile('extract-insights-sent', {
          emailContent,
          emailDate,
          emailMetadata,
          todaysDate
        });

        const result = await generateObject({
          model,
          schema,
          prompt: promptText,
          ...config
        });

        return { 
          inferences: result.object.inferences,
          classification: null // Sent emails don't use classification yet
        };
      }

      // For received emails, use the new prompt chain
      const result = await this.processReceivedEmailChain(emailContent, emailDate, emailMetadata);
      return {
        inferences: result.insights, // Convert insights back to inferences for legacy compatibility
        classification: result.classification
      };

    } catch (error) {
      console.error('Error in AI processMessage:', error);
      return { 
        inferences: [],
        classification: null
      };
    }
  }

  /**
   * Process received emails using the classification + specialized extraction chain
   */
  private async processReceivedEmailChain(
    emailContent: string, 
    emailDate: string, 
    emailMetadata: any,
    userInfo?: any
  ): Promise<{ insights: any[]; classification: { emailType: string; confidence: number; reasoning: string } | null }> {
    try {
      const todaysDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Step 1: Classify the email type
      const { model: classifyModel, promptText: classifyPrompt, schema: classifySchema, config: classifyConfig } = 
        await this.loadPromptFile('received/classify-email', {
          emailContent,
          emailDate,
          emailMetadata,
          todaysDate
        });

      const classifyResult = await generateObject({
        model: classifyModel,
        schema: classifySchema,
        prompt: classifyPrompt,
        ...classifyConfig
      });

      const { classification, confidence, reasoning } = classifyResult.object;

      // Step 2: Route to specialized extraction prompt
      const extractPromptMap = {
        'newsletter': 'received/extract-newsletter',
        'service': 'received/extract-service',
        'marketing': 'received/extract-marketing',
        'personal': 'received/extract-personal',
        'professional': 'received/extract-professional'
      };

      const extractPromptName = extractPromptMap[classification as keyof typeof extractPromptMap];
      if (!extractPromptName) {
        console.warn(`⚠️ Unknown email type: ${classification}, skipping extraction`);
        return { 
          insights: [],
          classification: {
            emailType: classification,
            confidence,
            reasoning
          }
        };
      }

      console.log(`⚡ Using specialized prompt: ${extractPromptName}`);
      const { model: extractModel, promptText: extractPrompt, schema: extractSchema, config: extractConfig } = 
        await this.loadPromptFile(extractPromptName, {
          emailContent,
          emailDate,
          emailMetadata,
          todaysDate,
          userInfo
        });

      const extractResult = await generateObject({
        model: extractModel,
        schema: extractSchema,
        prompt: extractPrompt,
        ...extractConfig
      });

      return { 
        insights: extractResult.object.inferences,
        classification: {
          emailType: classification,
          confidence,
          reasoning
        }
      };

    } catch (error) {
      console.error('Error in received email chain:', error);
      // Fallback to empty results rather than failing completely
      return { 
        insights: [],
        classification: null
      };
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
      const { model, promptText, schema, config } = await this.loadPromptFile('blend-profile', {
        category,
        ...categoryFlags,
        newInsights: insightsWithLanguage,
        existingContent,
        userInfo,
        todaysDate
      });

      const result = await generateObject({
        model,
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
      const { model, promptText, schema, config } = await this.loadPromptFile('compile-profile', {
        profileFiles,
        userInfo,
        todaysDate
      });

      const result = await generateObject({
        model,
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
  }): Promise<{ summary: string; automations: any[] }> {
    try {
      const todaysDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Load and render the analyze-automation prompt
      const { model, promptText, schema, config } = await this.loadPromptFile('analyze-automation', {
        profileFiles,
        userInfo,
        todaysDate
      });

      const result = await generateObject({
        model,
        schema,
        prompt: promptText,
        ...config
      });

      return {
        summary: result.object.summary,
        automations: result.object.automations
      };

    } catch (error) {
      console.error('Error in AI analyzeAutomation:', error);
      throw error;
    }
  }

  /**
   * Generate friendly status messages from insights for real-time user feedback
   */
  async generateStatusMessage({
    insights,
    userInfo
  }: {
    insights: any[];
    userInfo: any;
  }): Promise<string> {
    try {
      if (insights.length === 0) {
        return "Reading through your emails...";
      }

      const todaysDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Load and render the generate-status prompt
      const { model, promptText, schema, config } = await this.loadPromptFile('generate-status', {
        insights,
        userInfo,
        todaysDate
      });

      const result = await generateObject({
        model,
        schema,
        prompt: promptText,
        ...config
      });

      return result.object.message.trim();

    } catch (error) {
      console.error('Error generating status message:', error);
      return "Discovering interesting things about you...";
    }
  }


} 