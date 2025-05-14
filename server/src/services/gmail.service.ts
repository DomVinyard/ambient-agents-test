import { google } from 'googleapis';
import { gmail_v1 } from 'googleapis';
import { GaxiosResponse } from 'gaxios';
import fetch from 'node-fetch';

export class GmailService {
  private oauth2Client;
  private readonly CLIENT_ID: string;
  private readonly CLIENT_SECRET: string;
  private readonly REDIRECT_URI: string;
  private readonly DAYS_TO_FETCH = 30 * 3;

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

  async syncEmails(tokens: any) {
    const tempOAuth2 = new google.auth.OAuth2(this.CLIENT_ID, this.CLIENT_SECRET, this.REDIRECT_URI);
    tempOAuth2.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: tempOAuth2 });

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

    // Fetch all messages from the last 3 days
    const afterDate = new Date(Date.now() - this.DAYS_TO_FETCH * 24 * 60 * 60 * 1000);
    const afterStr = `${afterDate.getFullYear()}/${afterDate.getMonth() + 1}/${afterDate.getDate()}`;
    const q = `after:${afterStr}`;

    let allMessageIds: string[] = [];
    let pageToken: string | undefined = undefined;
    do {
      const res: GaxiosResponse<gmail_v1.Schema$ListMessagesResponse> = await gmail.users.messages.list({
        userId: 'me',
        q,
        pageToken,
      });
      const messages = res.data.messages || [];
      allMessageIds.push(...messages.map((m: gmail_v1.Schema$Message) => m.id!));
      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);

    allMessageIds.reverse(); // Oldest first

    // Fetch message details
    const emailData = await Promise.all(
      allMessageIds.map(async (id) => {
        const msgRes = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
        return {
          id: msgRes.data.id,
          snippet: msgRes.data.snippet,
          payload: msgRes.data.payload,
          internalDate: msgRes.data.internalDate,
          threadId: msgRes.data.threadId,
          labelIds: msgRes.data.labelIds,
        };
      })
    );

    return {
      email,
      firstName,
      lastName,
      emails: emailData
    };
  }
} 