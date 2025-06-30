import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Schema for email insights
const InferenceSchema = z.object({
  category: z.string().describe('Category of the inference (e.g., professional, personal, communication)'),
  insight: z.string().describe('The specific insight about the user'),
  confidence: z.number().min(0).max(1).describe('Confidence level of this inference'),
  evidence: z.string().describe('What in the email supports this inference')
});

const InferencesSchema = z.object({
  inferences: z.array(InferenceSchema)
});

export class AIService {
  private readonly model = openai('gpt-4-turbo');

  constructor() {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
  }

  /**
   * Process a single email to extract insights about the user
   */
  async processMessage(emailObj: any, userId: string): Promise<{ inferences: any[] }> {
    try {
      const emailContent = this.extractEmailContent(emailObj);
      console.log('Processing email with content length:', emailContent.length);
      console.log('Email snippet:', emailObj.snippet?.substring(0, 100) + '...');
      
      const prompt = `Analyze this email to extract factual insights about the user. Focus on:

**Professional Profile:**
- Job title, role, company, industry
- Responsibilities and decision-making authority
- Team structure and reporting relationships
- Work patterns and communication style

**Personal Characteristics:**
- Communication preferences and tone
- Time management and scheduling patterns
- Geographic location and travel habits
- Technology usage and workflow preferences

**Relationships and Networks:**
- Professional contacts and their roles
- Communication frequency with different people
- Collaboration patterns and meeting habits

**Behavioral Patterns:**
- Email response timing and patterns
- Task management and follow-up habits
- Information processing and decision styles
- Pain points and workflow inefficiencies

Email data:
${emailContent}

Extract specific, factual insights that build a comprehensive profile of this user. Only include insights you can directly infer from the email content. Be precise and evidence-based.`;

      const result = await generateObject({
        model: this.model,
        schema: InferencesSchema,
        prompt
      });

      console.log('AI extracted insights count:', result.object.inferences.length);
      if (result.object.inferences.length > 0) {
        console.log('Sample insight:', result.object.inferences[0]);
      }

      return { inferences: result.object.inferences };
    } catch (error) {
      console.error('Error in AI processMessage:', error);
      return { inferences: [] };
    }
  }

  /**
   * Extract readable content from email object
   */
  private extractEmailContent(emailObj: any): string {
    const headers = emailObj.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const to = headers.find((h: any) => h.name === 'To')?.value || '';
    const date = new Date(parseInt(emailObj.internalDate)).toISOString();
    
    return `
Subject: ${subject}
From: ${from}
To: ${to}
Date: ${date}
Snippet: ${emailObj.snippet || ''}
Thread ID: ${emailObj.threadId}
Labels: ${emailObj.labelIds?.join(', ') || 'none'}
`.trim();
  }
} 