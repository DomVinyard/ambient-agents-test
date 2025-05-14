import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import { ZepClient } from '@getzep/zep-cloud';
import { GraphDataType } from '@getzep/zep-cloud/api';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

const EMAILS_TO_FETCH = 150;

// Gmail OAuth2 setup
const CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/auth/gmail/callback';
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const WORDWARE_API_KEY = process.env.WORDWARE_API_KEY;
const WORDWARE_APP_IDS = {
  PROCESS_MESSAGE: '7ee20900-4421-41e2-8bc7-baad681a0444',
  ANSWER_QUESTION: '1718d875-afd5-4f02-8c33-f5f3efc5a029'
};
const WORDWARE_URL = `https://api.wordware.ai/v1/apps/${WORDWARE_APP_IDS.PROCESS_MESSAGE}/runs`;

// Zep setup
const ZEP_API_KEY = process.env.ZEP_API_KEY;
if (!ZEP_API_KEY) {
  console.error('ZEP_API_KEY is not set in environment variables');
  process.exit(1);
}
const zepClient = new ZepClient({
  apiKey: ZEP_API_KEY,
});

// Helper to get sessionId from request
function getSessionId(req: any): string {
  // Prefer body, then query, then default
  return (
    req.body?.sessionId ||
    req.query?.sessionId ||
    'default'
  );
}

// 1. Start OAuth flow
app.get('/auth/gmail', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid',
    'profile',
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
  res.redirect(url);
});

// 2. OAuth callback
app.get('/auth/gmail/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('Missing code');
  try {
    const { tokens } = await oauth2Client.getToken(code);
    // For prototype: pass tokens in the URL (not secure for production)
    const tokensParam = encodeURIComponent(JSON.stringify(tokens));
    res.redirect(`http://localhost:3000/actions?gmail=success&tokens=${tokensParam}`);
  } catch (err) {
    res.redirect('http://localhost:3000/actions?gmail=error');
  }
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/gmail/sync', async (req, res) => {
  const { tokens } = req.body;
  const sessionId = getSessionId(req);
  if (!tokens) {
    console.error('No tokens provided');
    return res.status(400).json({ error: 'Missing tokens' });
  }
  try {
    const tempOAuth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
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
    await zepClient.user.delete(sessionId);
    // Add user to Zep before deleting or writing any graph data
    await zepClient.user.add({
      userId: sessionId,
      email,
      firstName,
      lastName
    });
    // Fetch the latest 10 messages
    const listRes = await gmail.users.messages.list({ userId: 'me', maxResults: EMAILS_TO_FETCH });
    const messages = listRes.data.messages || [];
    let inferences = [] as any;
    console.log('Fetched message list:', messages.map(m => m.id));
    // Fetch message details
    let i = 1
    const emailData = await Promise.all(
      messages.map(async (msg) => {
        const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
        const emailObj = {
          id: msg.id,
          snippet: msgRes.data.snippet,
          payload: msgRes.data.payload,
          internalDate: msgRes.data.internalDate,
          threadId: msgRes.data.threadId,
          labelIds: msgRes.data.labelIds,
        };
        // Send to Wordware for processing
        let wordwareResult = null;
        try {
          const wwConfig = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${WORDWARE_API_KEY}`,
            },
            body: JSON.stringify({
              data: {
                type: 'runs',
                attributes: {
                  inputs: { 
                    'Raw Email': JSON.stringify(emailObj),
                    'User ID': email
                  },
                  webhooks: [],
                  await: { timeout: 300 }
                }
              }
            })
          }
          const wwRes = await fetch(WORDWARE_URL, wwConfig);
          wordwareResult = await wwRes.json();
          inferences = (wordwareResult as any)?.data?.attributes?.outputs?.Inferences.Inferences;

          // Batch add inferences for this email only
          if (Array.isArray(inferences) && inferences.length > 0) {
            const episodes = inferences.map((inference) => ({
              data: inference,
              type: GraphDataType.Text,
              sourceDescription: 'gmail',
              created_at: emailObj.internalDate
            }));
            zepClient.graph.addBatch({ episodes, userId: sessionId });
          }
          console.log(`${i}/${messages.length}`)
          i++
        } catch (e) {
          wordwareResult = { error: String(e) };
        }
        return { ...emailObj, wordware: inferences };
      })
    );
    console.log('Fetched and processed email details:', emailData.length);
    res.json({ emails: emailData });
  } catch (err) {
    console.error('Error in /api/gmail/sync:', err);
    res.status(500).json({ error: 'Failed to fetch emails', details: err instanceof Error ? err.message : err });
  }
});

app.get('/api/zep/read', async (req, res) => {
  const sessionId = getSessionId(req);
  try {
    const memories = await zepClient.memory.getSessionMessages(sessionId, {
      limit: 100
    });
    res.json(memories);
  } catch (err) {
    console.error('Error reading from Zep:', err);
    res.status(500).json({ error: 'Failed to read from memory', details: err instanceof Error ? err.message : err });
  }
});

// Add new endpoint for querying memory
app.post('/api/zep/query', async (req, res) => {
  const sessionId = getSessionId(req);
  const { query, limit = 10 } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // Use Zep's graph search to find relevant facts
    const searchResults = await zepClient.graph.search({
      query,
      userId: sessionId,
      limit,
      reranker: 'cross_encoder' // Use cross-encoder for better semantic matching
    });

    // Format the results - handle the graph search results format
    const edges = searchResults.edges || [];
    const formattedMemories = edges.map(edge => ({
      content: edge.fact,
      metadata: {
        source: edge.name || 'unknown',
        timestamp: edge.createdAt,
        score: 1.0 // Since we don't have a score in the edge data
      },
      relevance: 1.0
    }));

    // Send to Wordware for processing
    const wordwareResult = await fetch(`https://api.wordware.ai/v1/apps/${WORDWARE_APP_IDS.ANSWER_QUESTION}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORDWARE_API_KEY}`
      },
      body: JSON.stringify({
        data: {
          type: 'runs',
          attributes: {
            inputs: {
              Question: query,
              Memories: JSON.stringify(formattedMemories)
            },
            webhooks: [],
            await: { timeout: 300 }
          }
        }
      })
    });

    const wordwareData = await wordwareResult.json();
    console.log('Wordware data:', wordwareData);
    const answer = (wordwareData as any)?.data?.attributes?.outputs?.Answer?.answer;
    console.log('Wordware answer:', answer);

    // Return both the answer and the raw memories
    res.json({
      answer,
      memories: formattedMemories
    });
  } catch (err) {
    console.error('Error querying memory:', err);
    res.status(500).json({ error: 'Failed to query memory', details: err instanceof Error ? err.message : err });
  }
});

// Add mock agent endpoint
app.get('/api/mock-agent', (req, res) => {
  const mockAgent = {
    id: 'mock-agent-1',
    name: 'Mock Agent',
    description: 'This is a mock agent for testing refresh functionality.',
    trigger: 'When user clicks refresh',
    prompt: 'Summarize the last 10 emails.',
    available_tools: ['gmail.messages.list', 'gmail.messages.get'],
    human_in_the_loop_guidance: 'Review the summary before approving.'
  };
  res.json(mockAgent);
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 