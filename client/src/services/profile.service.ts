import axios from 'axios';
import pLimit from 'p-limit';
import { storageService } from './storage.service';

export interface ProfileBuildOptions {
  emailsToProcess?: any[];
  userInfoToUse?: any;
  onProgressUpdate?: (stage: string, progress: { processed: number; total: number }) => void;
  onStatusUpdate?: (status: string) => void;
  onInsightReceived?: (insights: any[]) => void;
  clearExistingData?: boolean;
}

export interface ProfileBuildResult {
  success: boolean;
  totalCategories: number;
  successfulEmails: number;
  totalEmails: number;
  profileFiles: Record<string, string>;
  errorCount: number;
}

class ProfileService {
  private aiLimit = pLimit(20);

  private getAuthTokens() {
    const authData = localStorage.getItem('ambient-agents-auth');
    if (!authData) {
      throw new Error('Not authenticated');
    }
    
    const { tokens: tokenString } = JSON.parse(authData);
    if (!tokenString) {
      throw new Error('No tokens found');
    }
    
    return typeof tokenString === 'string' ? JSON.parse(decodeURIComponent(tokenString)) : tokenString;
  }

  async fetchEmails(options: {
    sentCount: number;
    receivedCount: number;
    onProgressUpdate?: (stage: string, progress: { processed: number; total: number }) => void;
  }) {
    const tokens = this.getAuthTokens();
    
    options.onProgressUpdate?.('fetchProgress', { processed: 0, total: 1 });
    
    const response = await axios.post('http://localhost:3001/api/gmail/fetch-emails', {
      tokens,
      sessionId: 'default',
      sentCount: options.sentCount,
      receivedCount: options.receivedCount
    });

    const newEmails = response.data.emails;
    const userInfo = response.data.userInfo;
    
    // Store in IndexedDB
    await Promise.all([
      storageService.setEmails(newEmails),
      storageService.setUserInfo(userInfo),
      storageService.setInsights({}) // Clear insights
    ]);

    options.onProgressUpdate?.('fetchProgress', { processed: 1, total: 1 });
    
    return { emails: newEmails, userInfo };
  }

  async buildProfile(options: ProfileBuildOptions): Promise<ProfileBuildResult> {
    const currentEmails = options.emailsToProcess || await storageService.getEmails();
    const currentUserInfo = options.userInfoToUse || await storageService.getUserInfo();
    
    if (currentEmails.length === 0) {
      throw new Error('No emails available');
    }
    
    console.log(`🚀 Starting profile building with ${currentEmails.length} emails`);
    
    // Clear existing insights if requested
    if (options.clearExistingData) {
      await storageService.setInsights({});
    }

    options.onProgressUpdate?.('insightsProgress', { processed: 0, total: currentEmails.length });
    
    try {
      const tokens = this.getAuthTokens();
      
      // Step 1: Extract insights from all emails
      let processedCount = 0;
      let currentErrorCount = 0;
      
      const extractPromises = currentEmails.map((email: any, index: number) => 
        this.aiLimit(async () => {
          try {
            console.log(`Processing email ${index + 1}/${currentEmails.length}: ${email.subject.substring(0, 50)}...`);
            
            const response = await axios.post('http://localhost:3001/api/gmail/extract-insights', {
              tokens,
              emailId: email.id,
              emailData: email,
              sessionId: 'default'
            });
          
            const insights = response.data.insights || [];
            
            // Emit insights in real-time for status updates
            if (insights.length > 0 && options.onInsightReceived) {
              options.onInsightReceived(insights);
            }
            
            return {
              emailId: email.id,
              insights
            };
          } catch (error: any) {
            console.error(`❌ Failed to extract insights from email "${email.subject}":`, error?.response?.data?.error || error?.message);
            currentErrorCount++;
            return {
              emailId: email.id,
              insights: []
            };
          } finally {
            processedCount++;
            options.onProgressUpdate?.('insightsProgress', { processed: processedCount, total: currentEmails.length });
          }
        })
      );
      
      const extractResults = await Promise.all(extractPromises);
      const successfulEmails = extractResults.filter(r => r.insights.length > 0).length;
      
      // Step 2: Group insights by category
      const allInsights: any[] = [];
      extractResults.forEach(({ insights }) => {
        allInsights.push(...insights);
      });
      
      const insightsByCategory: Record<string, any[]> = {};
      allInsights.forEach(insight => {
        insight.categories.forEach((category: string) => {
          if (!insightsByCategory[category]) {
            insightsByCategory[category] = [];
          }
          insightsByCategory[category].push(insight);
        });
      });
      
      // Step 3: Generate profile files
      const categoryCount = Object.keys(insightsByCategory).length;
      options.onProgressUpdate?.('profileProgress', { processed: 0, total: categoryCount });
      
      let profileProcessedCount = 0;
      let profileErrorCount = 0;
      const generatedProfileFiles: Record<string, string> = {};
      
      const applyPromises = Object.entries(insightsByCategory).map(async ([category, categoryInsights]: [string, any[]]) => {
        const fileName = `${category}.md`;
        
        try {
          const response = await axios.post('http://localhost:3001/api/ai/blend-profile', {
            tokens,
            category,
            newInsights: categoryInsights,
            existingContent: null,
            userInfo: currentUserInfo,
            sessionId: 'default'
          });
          
          const blendedContent = response.data.content;
          generatedProfileFiles[fileName] = blendedContent;
          
          return { category, success: true };
        } catch (error) {
          console.error(`Error applying insights to ${category}:`, error);
          profileErrorCount++;
          return { category, success: false };
        } finally {
          profileProcessedCount++;
          options.onProgressUpdate?.('profileProgress', { processed: profileProcessedCount, total: categoryCount });
        }
      });
      
      const applyResults = await Promise.all(applyPromises);
      const successfulCategories = applyResults.filter(r => r.success).length;
      
      // Step 4: Compile final profiles
      if (successfulCategories > 0) {
        options.onProgressUpdate?.('compileProgress', { processed: 0, total: 2 });
        
        try {
          const [compileResponse, automationResponse] = await Promise.all([
            axios.post('http://localhost:3001/api/ai/compile-profile', {
              tokens,
              profileFiles: generatedProfileFiles,
              userInfo: currentUserInfo,
              sessionId: 'default'
            }),
            axios.post('http://localhost:3001/api/ai/analyze-automation', {
              tokens,
              profileFiles: generatedProfileFiles,
              userInfo: currentUserInfo,
              sessionId: 'default'
            })
          ]);
          
          generatedProfileFiles['full.md'] = compileResponse.data.content;
          generatedProfileFiles['automation.md'] = automationResponse.data.content;
          
          options.onProgressUpdate?.('compileProgress', { processed: 2, total: 2 });
        } catch (error) {
          console.error('Error during compilation:', error);
        }
      }
      
      return {
        success: true,
        totalCategories: categoryCount,
        successfulEmails,
        totalEmails: currentEmails.length,
        profileFiles: generatedProfileFiles,
        errorCount: currentErrorCount + profileErrorCount
      };
      
    } catch (error) {
      console.error('❌ Profile building failed:', error);
      throw error;
    }
  }
}

export const profileService = new ProfileService(); 