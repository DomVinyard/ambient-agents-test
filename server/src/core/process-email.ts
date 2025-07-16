import { generateObject } from 'ai';
import { PromptManager } from '../utils/prompt-manager';
import { emailToPlaintext, extractEmailMetadata } from '../utils/email-to-plaintext';

export interface EmailClassification {
  emailType: string;
  confidence: number;
  reasoning: string;
}

export interface InsightExtractionResult {
  insights: any[];
  classification: EmailClassification | null;
}

export class EmailProcessor {
  private promptManager: PromptManager;

  constructor(promptManager: PromptManager) {
    this.promptManager = promptManager;
  }

  /**
   * Classify an email without extracting insights (lighter operation for fetch time)
   */
  async classifyEmail(emailObj: any): Promise<EmailClassification | null> {
    try {
      // Skip classification for sent emails - they don't use the received email classification system
      if (emailObj.emailType === 'sent') {
        return null;
      }

      const emailContent = emailObj.fullBody || emailToPlaintext(emailObj);
      const emailDate = new Date(parseInt(emailObj.internalDate || '0')).toISOString().split('T')[0];
      const todaysDate = new Date().toISOString().split('T')[0];
      const emailMetadata = extractEmailMetadata(emailObj);

      const { model, promptText, schema, config } = 
        await this.promptManager.loadPromptFile('received/classify-email', {
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

      const { classification, confidence, reasoning } = result.object as any;

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
  async extractInsightsWithClassification(emailObj: any, userInfo?: any): Promise<InsightExtractionResult> {
    try {
      const emailContent = emailObj.fullBody || emailToPlaintext(emailObj);
      const emailDate = new Date(parseInt(emailObj.internalDate || '0')).toISOString().split('T')[0];
      const emailMetadata = extractEmailMetadata(emailObj);

      // For sent emails, use the existing prompt (no classification needed)
      if (emailObj.emailType === 'sent') {
        const todaysDate = new Date().toISOString().split('T')[0];
        
        const { model, promptText, schema, config } = 
          await this.promptManager.loadPromptFile('extract-insights-sent', {
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
          insights: (result.object as any).inferences,
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
  ): Promise<InsightExtractionResult> {
    try {
      const todaysDate = new Date().toISOString().split('T')[0];

      // Step 1: Classify the email type
      const { model: classifyModel, promptText: classifyPrompt, schema: classifySchema, config: classifyConfig } = 
        await this.promptManager.loadPromptFile('received/classify-email', {
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

      const { classification, confidence, reasoning } = classifyResult.object as any;

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
      const { model: extractModel, promptText: extractPrompt, schema: extractSchema, config: extractConfig } = 
        await this.promptManager.loadPromptFile(extractPromptName, {
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
        insights: (extractResult.object as any).inferences,
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
} 