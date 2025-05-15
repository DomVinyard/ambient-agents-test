import fetch from 'node-fetch';
import { ZepService } from './zep.service';

interface WordwareResponse {
  data?: {
    attributes?: {
      outputs?: {
        Inferences?: {
          Inferences: any[];
        };
        Answer?: {
          answer: string;
        };
        'Suggested Agents'?: {
          suggested: any[];
        };
      };
    };
  };
}

interface GraphEdge {
  fact: string;
  name?: string;
  createdAt?: string;
}

export class WordwareService {
  private readonly API_KEY: string;
  private readonly APP_IDS = {
    PROCESS_MESSAGE: '7ee20900-4421-41e2-8bc7-baad681a0444',
    ANSWER_QUESTION: '1718d875-afd5-4f02-8c33-f5f3efc5a029',
    SUGGEST_AGENT: 'c279e492-d462-4273-b1f4-183086772bcf'
  };
  private readonly zepService: ZepService;

  constructor() {
    const API_KEY = process.env.WORDWARE_API_KEY;
    if (!API_KEY) {
      throw new Error('WORDWARE_API_KEY is not set in environment variables');
    }
    this.API_KEY = API_KEY;
    this.zepService = new ZepService();
  }

  private getAppUrl(appId: string): string {
    return `https://api.wordware.ai/v1/apps/${appId}/runs`;
  }

  async processMessage(emailObj: any, userId: string): Promise<WordwareResponse> {
    try {
      const response = await fetch(this.getAppUrl(this.APP_IDS.PROCESS_MESSAGE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`,
        },
        body: JSON.stringify({
          data: {
            type: 'runs',
            attributes: {
              inputs: { 
                'Raw Email': JSON.stringify(emailObj),
                'User ID': userId
              },
              webhooks: [],
              await: { timeout: 300 }
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Wordware API error (${response.status}):`, errorText);
        throw new Error(`Wordware API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from Wordware API');
      }

      return data as WordwareResponse;
    } catch (error) {
      console.error('Error in Wordware processMessage:', error);
      throw error;
    }
  }

  async answerQuestion(query: string, memories: any[]): Promise<WordwareResponse> {
    try {
      const response = await fetch(this.getAppUrl(this.APP_IDS.ANSWER_QUESTION), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        },
        body: JSON.stringify({
          data: {
            type: 'runs',
            attributes: {
              inputs: {
                Question: query,
                Memories: JSON.stringify(memories)
              },
              webhooks: [],
              await: { timeout: 300 }
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Wordware API error (${response.status}):`, errorText);
        throw new Error(`Wordware API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from Wordware API');
      }

      return data as WordwareResponse;
    } catch (error) {
      console.error('Error in Wordware answerQuestion:', error);
      throw error;
    }
  }

  private async gatherUserContext(userId: string): Promise<any> {
    // Search for user's patterns, preferences, and behaviors
    const patterns = await this.zepService.searchGraph(
      "Find patterns in user's behavior, preferences, and recurring tasks",
      userId,
      20
    );

    // Search for user's relationships and interactions
    const relationships = await this.zepService.searchGraph(
      "Find information about user's relationships, contacts, and frequent interactions",
      userId,
      20
    );

    // Search for user's work context and responsibilities
    const workContext = await this.zepService.searchGraph(
      "Find information about user's work context, responsibilities, and professional activities",
      userId,
      20
    );

    // Search for user's communication patterns
    const communicationPatterns = await this.zepService.searchGraph(
      "Find patterns in how the user communicates, their email habits, and response times",
      userId,
      20
    );

    // Search for user's scheduling and time management
    const schedulingPatterns = await this.zepService.searchGraph(
      "Find information about user's scheduling patterns, meeting frequency, and time management",
      userId,
      20
    );

    // Search for user's project and task management
    const projectContext = await this.zepService.searchGraph(
      "Find information about user's projects, tasks, deadlines, and work priorities",
      userId,
      20
    );

    // Search for user's information management
    const informationManagement = await this.zepService.searchGraph(
      "Find patterns in how user organizes information, files, and documents",
      userId,
      20
    );

    // Search for user's decision making patterns
    const decisionPatterns = await this.zepService.searchGraph(
      "Find patterns in user's decision making, approvals, and review processes",
      userId,
      20
    );

    // Search for user's collaboration patterns
    const collaborationPatterns = await this.zepService.searchGraph(
      "Find information about user's team collaboration, shared responsibilities, and group dynamics",
      userId,
      20
    );

    // Search for user's automation opportunities
    const automationOpportunities = await this.zepService.searchGraph(
      "Find repetitive tasks, manual processes, and potential automation opportunities",
      userId,
      20
    );

    return {
      patterns: patterns.edges?.map((edge: GraphEdge) => edge.fact) || [],
      relationships: relationships.edges?.map((edge: GraphEdge) => edge.fact) || [],
      workContext: workContext.edges?.map((edge: GraphEdge) => edge.fact) || [],
      communicationPatterns: communicationPatterns.edges?.map((edge: GraphEdge) => edge.fact) || [],
      schedulingPatterns: schedulingPatterns.edges?.map((edge: GraphEdge) => edge.fact) || [],
      projectContext: projectContext.edges?.map((edge: GraphEdge) => edge.fact) || [],
      informationManagement: informationManagement.edges?.map((edge: GraphEdge) => edge.fact) || [],
      decisionPatterns: decisionPatterns.edges?.map((edge: GraphEdge) => edge.fact) || [],
      collaborationPatterns: collaborationPatterns.edges?.map((edge: GraphEdge) => edge.fact) || [],
      automationOpportunities: automationOpportunities.edges?.map((edge: GraphEdge) => edge.fact) || []
    };
  }

  async suggestAgents(userId: string, userEmail: string): Promise<WordwareResponse> {
    try {
      // Gather comprehensive user context from the graph
      const userContext = await this.gatherUserContext(userId);
      console.log('userContext', userContext);

      const response = await fetch(this.getAppUrl(this.APP_IDS.SUGGEST_AGENT), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`,
        },
        body: JSON.stringify({
          data: {
            type: 'runs',
            attributes: {
              inputs: {
                Episodes: JSON.stringify(userContext),
                User: userEmail,
          },
              webhooks: [],
              await: { timeout: 300 }
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Wordware API error (${response.status}):`, errorText);
        throw new Error(`Wordware API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from Wordware API');
      }

      return data as WordwareResponse;
    } catch (error) {
      console.error('Error in Wordware suggestAgents:', error);
      throw error;
    }
  }
} 