import { generateObject } from 'ai';
import { PromptManager } from '../utils/prompt-manager';
import { PROFILE_COMPILATION_WORD_LIMIT } from '../consts';

export interface AutomationAnalysis {
  summary: string;
  automations: any[];
}

export class ProfileManager {
  private promptManager: PromptManager;

  constructor(promptManager: PromptManager) {
    this.promptManager = promptManager;
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
      
      // Pass insights directly - prompts use explicit confidence attribution

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

              const { model, promptText, schema, config } = 
          await this.promptManager.loadPromptFile('blend-profile', {
            category,
            ...categoryFlags,
            newInsights,
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

      return (result.object as any).content;

    } catch (error) {
      console.error('Error in profile blending:', error);
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

      const { model, promptText, schema, config } = 
        await this.promptManager.loadPromptFile('compile-profile', {
          profileFiles,
          userInfo,
          todaysDate,
          wordLimit: PROFILE_COMPILATION_WORD_LIMIT
        });

      const result = await generateObject({
        model,
        schema,
        prompt: promptText,
        ...config
      });

      return (result.object as any).content;

    } catch (error) {
      console.error('Error in profile compilation:', error);
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
  }): Promise<AutomationAnalysis> {
    try {
      const todaysDate = new Date().toISOString().split('T')[0];

      const { model, promptText, schema, config } = 
        await this.promptManager.loadPromptFile('analyze-automation', {
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

      return result.object as AutomationAnalysis;

    } catch (error) {
      console.error('Error in automation analysis:', error);
      throw error;
    }
  }
} 