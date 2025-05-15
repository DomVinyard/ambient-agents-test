import { ZepClient } from '@getzep/zep-cloud';
import { GraphDataType } from '@getzep/zep-cloud/api';

export class ZepService {
  private client: ZepClient;

  constructor() {
    const ZEP_API_KEY = process.env.ZEP_API_KEY;
    if (!ZEP_API_KEY) {
      throw new Error('ZEP_API_KEY is not set in environment variables');
    }
    this.client = new ZepClient({
      apiKey: ZEP_API_KEY,
    });
  }

  async deleteUser(sessionId: string) {
    await this.client.user.delete(sessionId);
  }

  async addUser(sessionId: string, email: string, firstName: string, lastName: string) {
    await this.client.user.add({
      userId: sessionId,
      email,
      firstName,
      lastName
    });
  }

  async addBatchInferences(sessionId: string, inferences: any[], sourceDescription: string, created_at: string) {
    if (Array.isArray(inferences) && inferences.length > 0) {
      const episodes = inferences.map((inference) => ({
        data: inference,
        type: GraphDataType.Text,
        sourceDescription,
        created_at
      }));
      await this.client.graph.addBatch({ episodes, userId: sessionId });
    }
  }

  async getSessionMessages(sessionId: string, limit: number = 100) {
    return await this.client.memory.getSessionMessages(sessionId, { limit });
  }

  async searchGraph(query: string, userId: string, limit: number = 10) {
    return await this.client.graph.search({
      query,
      userId,
      limit,
      reranker: 'rrf'
    });
  }

  async getEpisodesByUserId(userId: string, lastn: number = 100) {
    return await this.client.graph.episode.getByUserId(userId, { lastn });
  }

  async getUser(userId: string) {
    return await this.client.user.get(userId);
  }
} 