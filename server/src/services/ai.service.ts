import { PromptManager } from '../utils/prompt-manager';
import { EmailProcessor, EmailClassification, InsightExtractionResult } from '../core/process-email';
import { ProfileManager, AutomationAnalysis } from '../core/generate-profile';

export class AIService {
  private promptManager: PromptManager;
  private emailProcessor: EmailProcessor;
  private profileManager: ProfileManager;

  constructor() {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    // Initialize utility classes
    this.promptManager = new PromptManager();
    this.emailProcessor = new EmailProcessor(this.promptManager);
    this.profileManager = new ProfileManager(this.promptManager);
  }

  /**
   * Classify an email without extracting insights (lighter operation for fetch time)
   */
  async classifyEmail(emailObj: any): Promise<EmailClassification | null> {
    return this.emailProcessor.classifyEmail(emailObj);
  }

  /**
   * Extract insights from an email WITH classification (primary method for extract-insights endpoint)
   */
  async extractInsightsWithClassification(emailObj: any, userInfo?: any): Promise<InsightExtractionResult> {
    return this.emailProcessor.extractInsightsWithClassification(emailObj, userInfo);
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
    return this.profileManager.blendProfile({
        category,
      newInsights,
        existingContent,
      userInfo
    });
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
    return this.profileManager.compileProfile({
        profileFiles,
      userInfo
    });
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
  }): Promise<AutomationAnalysis> {
    return this.profileManager.analyzeAutomation({
        profileFiles,
    userInfo
    });
      }
} 