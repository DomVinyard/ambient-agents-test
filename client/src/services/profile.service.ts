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
  private aiLimit = pLimit(200);

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
    let content = `# Background Automation Opportunities\n\n`;
    
    content += `## Summary\n${automationData.summary}\n\n`;
    
    content += `## Recommended Automations\n\n`;
    
    const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
    const sortedAutomations = automationData.automations.sort((a, b) => {
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - 
             (priorityOrder[b.priority as keyof typeof priorityOrder] || 4);
    });
    
    sortedAutomations.forEach((automation, index) => {
      const priorityEmoji = automation.priority === 'high' ? '🔥' : 
                           automation.priority === 'medium' ? '⚡' : '💡';
      const categoryEmoji = automation.category === 'communication' ? '💬' :
                           automation.category === 'productivity' ? '⚡' :
                           automation.category === 'finance' ? '💳' :
                           automation.category === 'health' ? '🏥' :
                           automation.category === 'learning' ? '📚' :
                           automation.category === 'relationships' ? '👥' :
                           automation.category === 'travel' ? '✈️' :
                           automation.category === 'shopping' ? '🛒' : '🤖';
      
      content += `### ${priorityEmoji} ${automation.name}\n`;
      content += `**Category:** ${categoryEmoji} ${automation.category.charAt(0).toUpperCase() + automation.category.slice(1)}\n`;
      content += `**Priority:** ${automation.priority.toUpperCase()}\n`;
      content += `**Complexity:** ${automation.complexity}\n\n`;
      
      content += `**Trigger:** ${automation.trigger}\n\n`;
      
      content += `**Actions:**\n`;
      automation.actions.forEach((action: string) => {
        content += `- ${action}\n`;
      });
      content += `\n`;
      
      content += `**Evidence:** ${automation.evidence}\n\n`;
      content += `**Expected Impact:** ${automation.impact}\n\n`;
      
      if (index < sortedAutomations.length - 1) {
        content += `---\n\n`;
      }
    });
    
    return content;
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
              userInfo: currentUserInfo,
              sessionId: 'default'
            });
          
            const insights = response.data.insights || [];
            const classification = response.data.classification;
            
            // Emit insights in real-time for status updates
            if (insights.length > 0 && options.onInsightReceived) {
              options.onInsightReceived(insights);
            }
            
            return {
              emailId: email.id,
              insights,
              classification
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
      
      // Update stored emails with fresh classification data
      const updatedEmails = currentEmails.map(email => {
        const extractResult = extractResults.find(r => r.emailId === email.id);
        if (extractResult?.classification) {
          return { ...email, classification: extractResult.classification };
        }
        return email;
      });
      
      // Store updated emails with classification data
      await storageService.setEmails(updatedEmails);
      
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
          
          // Convert automation JSON to readable format
          const automationData = automationResponse.data;
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
        errorCount: currentErrorCount + profileErrorCount
      };
      
    } catch (error) {
      console.error('❌ Profile building failed:', error);
      throw error;
    }
  }
}

export const profileService = new ProfileService(); 