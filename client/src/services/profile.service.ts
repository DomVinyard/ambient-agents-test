import axios from 'axios';
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
  automationData?: { summary: string; automations: any[] };
  errorCount: number;
}

class ProfileService {
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

  private formatAutomationData(automationData: { summary: string; automations: any[] }): string {
    // Return raw JSON instead of formatted markdown
    return JSON.stringify(automationData, null, 2);
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
      
      // Step 1: Extract insights from all emails using BATCH processing
      console.log(`🚀 Starting batch processing for ${currentEmails.length} emails`);
      
      let processedCount = 0;
      let currentErrorCount = 0;
      const BATCH_SIZE = 200; // Reduced from 100 to avoid payload size issues
      
              // Split emails into batches of 50
      const emailBatches = [];
      for (let i = 0; i < currentEmails.length; i += BATCH_SIZE) {
        emailBatches.push(currentEmails.slice(i, i + BATCH_SIZE));
      }

      console.log(`📦 Created ${emailBatches.length} batches of ${BATCH_SIZE} emails each`);

      // Store insights by email for aggregation
      const insightsByEmail: Record<string, any[]> = {};

      // Process batches sequentially to avoid overwhelming the server
      for (let batchIndex = 0; batchIndex < emailBatches.length; batchIndex++) {
        const batch = emailBatches[batchIndex];
        console.log(`📤 Processing batch ${batchIndex + 1}/${emailBatches.length} (${batch.length} emails)`);

        try {
          // Send batch to server
          const response = await axios.post('http://localhost:3001/api/gmail/extract-insights-batch', {
            tokens,
            emails: batch,
            userInfo: currentUserInfo,
            sessionId: 'default'
          });

          const { results, stats } = response.data;

          // Process batch results
          results.forEach((result: any) => {
            if (result.success) {
              const { emailId, insights, classification } = result;

              // Store insights for this email
              insightsByEmail[emailId] = insights;

              // Emit insights in real-time for status updates
              if (insights.length > 0 && options.onInsightReceived) {
                options.onInsightReceived(insights);
              }
            } else {
              currentErrorCount++;
              console.error(`❌ Failed to process email ${result.emailId}:`, result.error);
            }
          });

          // Update progress for the entire batch
          processedCount += batch.length;
          options.onProgressUpdate?.('insightsProgress', { processed: processedCount, total: currentEmails.length });

          console.log(`✅ Batch ${batchIndex + 1} complete: ${stats.successful}/${stats.total} emails processed, ${stats.totalInsights} insights extracted`);

        } catch (batchError: any) {
          console.error(`❌ Batch ${batchIndex + 1} failed:`, batchError?.message);
          currentErrorCount += batch.length;
          
          // Still update progress even for failed batches
          processedCount += batch.length;
          options.onProgressUpdate?.('insightsProgress', { processed: processedCount, total: currentEmails.length });
        }
      }

      // Count successful emails
      const successfulEmails = Object.keys(insightsByEmail).length;

      // Update stored emails with classification data (extract from results if available)
      // Note: This is simplified since batch processing returns results differently
      await storageService.setInsights(insightsByEmail);
      
      // Step 2: Group insights by category
      const allInsights: any[] = [];
      Object.values(insightsByEmail).forEach((emailInsights) => {
        allInsights.push(...emailInsights);
      });
      
      const insightsByCategoryMap: Record<string, any[]> = {};
      allInsights.forEach(insight => {
        insight.categories.forEach((category: string) => {
          if (!insightsByCategoryMap[category]) {
            insightsByCategoryMap[category] = [];
          }
          insightsByCategoryMap[category].push(insight);
        });
      });
      
      // Step 3: Generate profile files
      const categoryCount = Object.keys(insightsByCategoryMap).length;
      options.onProgressUpdate?.('profileProgress', { processed: 0, total: categoryCount });
      
      let profileProcessedCount = 0;
      let profileErrorCount = 0;
      const generatedProfileFiles: Record<string, string> = {};

      const applyPromises = Object.entries(insightsByCategoryMap).map(
        async ([category, categoryInsights]: [string, any[]]) => {
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
            generatedProfileFiles[`${category}.md`] = blendedContent;

            return { category, success: true };
          } catch (error) {
            console.error(`Error applying insights to ${category}:`, error);
            profileErrorCount++;
            return { category, success: false };
          } finally {
            profileProcessedCount++;
            options.onProgressUpdate?.('profileProgress', { processed: profileProcessedCount, total: categoryCount });
          }
        }
      );

      const applyResults = await Promise.all(applyPromises);
      const successfulCategories = applyResults.filter(r => r.success).length;
      
      // Step 4: Compile final profiles
      let automationData = undefined;
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
          
          // Convert automation JSON to readable format and store raw data
          automationData = automationResponse.data;
          const automationContent = this.formatAutomationData(automationData);
          generatedProfileFiles['automation.md'] = automationContent;
          
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
        automationData,
        errorCount: currentErrorCount + profileErrorCount
      };
      
    } catch (error) {
      console.error('❌ Profile building failed:', error);
      throw error;
    }
  }
}

export const profileService = new ProfileService(); 