import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Dotprompt } from 'dotprompt';
import * as fs from 'fs';
import * as path from 'path';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import { emailToPlaintext, extractEmailMetadata } from '../utils/email-to-plaintext';
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
      // Skip classification for sent emails - they don't use the received email classification system
      if (emailObj.emailType === 'sent') {
        return null;
      }

      const emailContent = emailObj.fullBody || emailToPlaintext(emailObj);
      const emailDate = new Date(parseInt(emailObj.internalDate || '0')).toISOString().split('T')[0];
      const todaysDate = new Date().toISOString().split('T')[0];
      const emailMetadata = extractEmailMetadata(emailObj);

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
   * Extract insights from an email WITH classification (primary method for extract-insights endpoint)
   */
  async extractInsightsWithClassification(emailObj: any, userInfo?: any): Promise<{ insights: any[]; classification: { emailType: string; confidence: number; reasoning: string } | null }> {
    try {
      const emailContent = emailObj.fullBody || emailToPlaintext(emailObj);
      const emailDate = new Date(parseInt(emailObj.internalDate || '0')).toISOString().split('T')[0];
      const emailMetadata = extractEmailMetadata(emailObj);

      // For sent emails, use the existing prompt (no classification needed)
      if (emailObj.emailType === 'sent') {
        const todaysDate = new Date().toISOString().split('T')[0];
        
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
   * Process received emails using the classification + specialized extraction chain
   */
  private async processReceivedEmailChain(
    emailContent: string, 
    emailDate: string, 
    emailMetadata: any,
    userInfo?: any
  ): Promise<{ insights: any[]; classification: { emailType: string; confidence: number; reasoning: string } | null }> {
    try {
      const todaysDate = new Date().toISOString().split('T')[0];

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
      const todaysDate = new Date().toISOString().split('T')[0];
      
      // Convert confidence scores to natural language modifiers
      const insightsWithLanguage = newInsights.map(insight => ({
        ...insight,
        confidenceLanguage: getConfidenceLanguage(insight.confidence)
      }));

      // Create boolean flags for each category
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
   * Compile all profile files into a comprehensive profile
   */
  async compileProfile({
    profileFiles,
    userInfo
  }: {
    profileFiles: Record<string, string>;
    userInfo: any;
  }): Promise<string> {
    try {
      const todaysDate = new Date().toISOString().split('T')[0];

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
   * Analyze profile content to suggest automation opportunities
   */
  async analyzeAutomation({
    profileFiles,
    userInfo
  }: {
    profileFiles: Record<string, string>;
    userInfo: any;
  }): Promise<{ summary: string; automations: any[] }> {
    try {
      const todaysDate = new Date().toISOString().split('T')[0];

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

      return result.object;

    } catch (error) {
      console.error('Error in AI analyzeAutomation:', error);
      throw error;
    }
  }
} 