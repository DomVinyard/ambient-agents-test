import { google } from 'googleapis';
import { gmail_v1 } from 'googleapis';
import { GaxiosResponse } from 'gaxios';
import fetch from 'node-fetch';
import { extractEmailBody } from '../utils/extract-email-body';
import { cleanHtmlContent } from '../utils/clean-html-content';

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

  constructor() {
    this.CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
    this.CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;
    this.REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/auth/gmail/callback';
    this.oauth2Client = new google.auth.OAuth2(this.CLIENT_ID, this.CLIENT_SECRET, this.REDIRECT_URI);
  }

  generateAuthUrl(): string {
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
    });
  }

  async getToken(code: string) {
    return await this.oauth2Client.getToken(code);
  }



  async syncEmails(tokens: any, options?: { sentCount?: number; receivedCount?: number }) {
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

    // Fetch message details sequentially to avoid rate limits
    const emailData = [];
    
    for (let i = 0; i < limitedMessageIds.length; i++) {
      const id = limitedMessageIds[i];
      try {
        const msgRes = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
        
        // Extract full email body
        const fullBody = msgRes.data.payload ? extractEmailBody(msgRes.data.payload) : '';
        
        emailData.push({
          id: msgRes.data.id,
          snippet: msgRes.data.snippet,
          payload: msgRes.data.payload,
          fullBody: fullBody,
          internalDate: msgRes.data.internalDate,
          threadId: msgRes.data.threadId,
          labelIds: msgRes.data.labelIds,
          emailType: emailTypeMap.get(id) || 'unknown',
        });
        
        // Small delay to avoid rate limiting (100ms between requests)
        if (i < limitedMessageIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error fetching email ${id}:`, error);
        // Continue with other emails even if one fails
      }
    }

    return {
      email,
      firstName,
      lastName,
      emails: emailData
    };
  }
} 