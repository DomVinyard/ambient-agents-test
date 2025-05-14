import fetch from 'node-fetch';

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

export class WordwareService {
  private readonly API_KEY: string;
  private readonly APP_IDS = {
    PROCESS_MESSAGE: '7ee20900-4421-41e2-8bc7-baad681a0444',
    ANSWER_QUESTION: '1718d875-afd5-4f02-8c33-f5f3efc5a029',
    SUGGEST_AGENT: 'c279e492-d462-4273-b1f4-183086772bcf'
  };

  constructor() {
    const API_KEY = process.env.WORDWARE_API_KEY;
    if (!API_KEY) {
      throw new Error('WORDWARE_API_KEY is not set in environment variables');
    }
    this.API_KEY = API_KEY;
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

  async suggestAgents(episodes: any[], userEmail: string): Promise<WordwareResponse> {
    try {
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
                Episodes: JSON.stringify(episodes),
                User: userEmail
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