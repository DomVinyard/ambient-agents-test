import { google } from 'googleapis';
import { gmail_v1 } from 'googleapis';
import { GaxiosResponse } from 'gaxios';
import fetch from 'node-fetch';
import { extractEmailBodyAsPlaintext } from '../utils/email-to-plaintext';

/**
 * Gmail Service for fetching emails
 * 
 * To change the number of emails fetched, modify the EMAIL_FETCH_LIMIT constant below
 */
export class GmailService {
  private oauth2Client;
  private readonly CLIENT_ID: string;
  private readonly CLIENT_SECRET: string;
  private readonly REDIRECT_URI: string;
  
  // Configurable email fetch limit - change this number to fetch more/fewer emails of each type
  private readonly EMAIL_FETCH_LIMIT_PER_TYPE = 10;
  
  // Rate limiting configuration for large batches
  private readonly CONCURRENT_REQUESTS = 20; // Process 20 emails at a time
  private readonly BATCH_DELAY = 250;        // 250ms between batches
  private readonly RETRY_DELAY = 1000;       // 1s base delay for retries

  constructor() {
    this.CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
    this.CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;
    this.REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/auth/gmail/callback';
    this.oauth2Client = new google.auth.OAuth2(this.CLIENT_ID, this.CLIENT_SECRET, this.REDIRECT_URI);
  }

  generateAuthUrl(mode: string = 'admin'): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
      'profile',
    ];
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: mode, // Pass mode as state parameter
    });
  }

  async getToken(code: string) {
    return await this.oauth2Client.getToken(code);
  }

  // Utility methods for rate limiting and batching
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = this.RETRY_DELAY
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        if (attempt === maxRetries - 1) throw error;
        
        // Check if it's a rate limit error
        const isRateLimit = error?.code === 429 || 
                           error?.status === 429 || 
                           error?.message?.includes('quota') ||
                           error?.message?.includes('rate');
        
        if (isRateLimit) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await this.delay(delay);
        } else {
          // For non-rate-limit errors, shorter delay
          await this.delay(500);
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

  private async fetchEmailsInBatches(
    gmail: any,
    messageIds: string[],
    emailTypeMap: Map<string, 'inbox' | 'sent'>,
    progressCallback?: (fetched: number, total: number) => void
  ): Promise<any[]> {
    const emailData: any[] = [];
    const batches = this.chunk(messageIds, this.CONCURRENT_REQUESTS);
    
    console.log(`Processing ${messageIds.length} emails in ${batches.length} batches of ${this.CONCURRENT_REQUESTS}`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStart = Date.now();
      
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} emails)`);
      
      // Process emails in this batch concurrently
      const batchPromises = batch.map(id => 
        this.retryWithBackoff(async () => {
          const msgRes = await gmail.users.messages.get({ 
            userId: 'me', 
            id, 
            format: 'full' 
          });
          
          // Extract full email body
          const fullBody = msgRes.data.payload ? extractEmailBodyAsPlaintext({ payload: msgRes.data.payload }) : '';
          
          return {
            id: msgRes.data.id,
            snippet: msgRes.data.snippet,
            payload: msgRes.data.payload,
            fullBody: fullBody,
            internalDate: msgRes.data.internalDate,
            threadId: msgRes.data.threadId,
            labelIds: msgRes.data.labelIds,
            emailType: emailTypeMap.get(id) || 'unknown',
          };
        })
      );
      
      try {
        const batchResults = await Promise.all(batchPromises);
        emailData.push(...batchResults);
        
        const batchTime = Date.now() - batchStart;
        console.log(`Batch ${batchIndex + 1} completed in ${batchTime}ms`);
        
        // Report progress
        if (progressCallback) {
          progressCallback(emailData.length, messageIds.length);
        }
        
        // Add delay between batches to respect rate limits
        if (batchIndex < batches.length - 1) {
          await this.delay(this.BATCH_DELAY);
        }
      } catch (error) {
        console.error(`Error processing batch ${batchIndex + 1}:`, error);
        // Continue with next batch even if this one fails
      }
    }
    
    return emailData;
  }

  async syncEmails(tokens: any, options?: { sentCount?: number; receivedCount?: number; progressCallback?: (fetched: number, total: number) => void }) {
    const tempOAuth2 = new google.auth.OAuth2(this.CLIENT_ID, this.CLIENT_SECRET, this.REDIRECT_URI);
    tempOAuth2.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: tempOAuth2 });

    // Use provided counts or fallback to default
    const receivedCount = options?.receivedCount ?? this.EMAIL_FETCH_LIMIT_PER_TYPE;
    const sentCount = options?.sentCount ?? this.EMAIL_FETCH_LIMIT_PER_TYPE;

    // Fetch Gmail user profile
    const profile = await gmail.users.getProfile({ userId: 'me' });

    // Fetch user's name and email from Google OAuth2 UserInfo endpoint
    let firstName = '';
    let lastName = '';
    let userInfoEmail = '';
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        firstName = (userInfo as any).given_name || '';
        lastName = (userInfo as any).family_name || '';
        userInfoEmail = (userInfo as any).email || '';
      }
    } catch (e) {
      // fallback to Gmail profile email only
    }

    const email = userInfoEmail || profile.data.emailAddress || '';

    // Fetch inbox emails
    const inboxRes: GaxiosResponse<gmail_v1.Schema$ListMessagesResponse> = await gmail.users.messages.list({
      userId: 'me',
      maxResults: receivedCount,
      labelIds: ['INBOX']
    });
    
    // Fetch sent emails
    const sentRes: GaxiosResponse<gmail_v1.Schema$ListMessagesResponse> = await gmail.users.messages.list({
      userId: 'me',
      maxResults: sentCount,
      labelIds: ['SENT']
    });
    
    const inboxMessages = inboxRes.data.messages || [];
    const sentMessages = sentRes.data.messages || [];
    
    // Create mapping to track email types
    const emailTypeMap = new Map<string, 'inbox' | 'sent'>();
    inboxMessages.forEach(msg => emailTypeMap.set(msg.id!, 'inbox'));
    sentMessages.forEach(msg => emailTypeMap.set(msg.id!, 'sent'));
    
    const allMessages = [...inboxMessages, ...sentMessages];
    const limitedMessageIds = allMessages.map((m: gmail_v1.Schema$Message) => m.id!);

    // Fetch message details in batches with rate limiting
    const emailData = await this.fetchEmailsInBatches(gmail, limitedMessageIds, emailTypeMap, options?.progressCallback);
    
    console.log(`Successfully fetched ${emailData.length}/${limitedMessageIds.length} emails`);

    return {
      email,
      firstName,
      lastName,
      emails: emailData
    };
  }
} 