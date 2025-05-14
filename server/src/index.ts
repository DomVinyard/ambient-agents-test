import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { GmailService } from './services/gmail.service';
import { ZepService } from './services/zep.service';
import { WordwareService } from './services/wordware.service';
import { pusherService } from './services/pusher.service';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const WORDWARE_CONCURRENCY_LIMIT = 100;

// Initialize services
const gmailService = new GmailService();
const zepService = new ZepService();
const wordwareService = new WordwareService();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const sessionId = getSessionId(req);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Session: ${sessionId}`);
  next();
});

// Helper to get sessionId from request
function getSessionId(req: any): string {
  return req.body?.sessionId || req.query?.sessionId || 'default';
}

// 1. Start OAuth flow
app.get('/auth/gmail', (req, res) => {
  console.log('Starting Gmail OAuth flow');
  const url = gmailService.generateAuthUrl();
  res.redirect(url);
});

// 2. OAuth callback
app.get('/auth/gmail/callback', async (req, res) => {
  console.log('Received OAuth callback');
  const code = req.query.code as string;
  if (!code) {
    console.error('OAuth callback missing code parameter');
    return res.status(400).send('Missing code');
  }
  try {
    const { tokens } = await gmailService.getToken(code);
    console.log('Successfully obtained Gmail tokens');
    const tokensParam = encodeURIComponent(JSON.stringify(tokens));
    res.redirect(`http://localhost:3000/actions?gmail=success&tokens=${tokensParam}`);
  } catch (err) {
    console.error('Error in OAuth callback:', err);
    res.redirect('http://localhost:3000/actions?gmail=error');
  }
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Helper for concurrency-limited processing
async function processWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  asyncFn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  const workers = Array.from({ length: limit }).map(async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await asyncFn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

app.post('/api/gmail/sync', async (req, res) => {
  const { tokens } = req.body;
  const sessionId = getSessionId(req);
  console.log(`Starting Gmail sync for session: ${sessionId}`);


  
  if (!tokens) {
    console.error('No tokens provided for Gmail sync');
    return res.status(400).json({ error: 'Missing tokens' });
  }

  try {
    const { email, firstName, lastName, emails } = await gmailService.syncEmails(tokens);
    await pusherService.trigger(`${sessionId}`, 'email-sync-start', {
      total: emails.length
    });
    
    // Clear existing user data
    await zepService.deleteUser(sessionId);
    
    // Add user to Zep
    await zepService.addUser(sessionId, email, firstName, lastName);

    // Process all emails with concurrency limit and emit a Pusher event for each
    await processWithConcurrencyLimit(
      emails,
      WORDWARE_CONCURRENCY_LIMIT,
      async (emailObj) => {
        try {
          console.log('Processing email');
          const wordwareResult = await wordwareService.processMessage(emailObj, email);
          const inferences = wordwareResult?.data?.attributes?.outputs?.Inferences?.Inferences || [];

          if (inferences.length > 0) {
            const timestamp = emailObj.internalDate || new Date().toISOString();
            await zepService.addBatchInferences(
              sessionId,
              inferences,
              'gmail',
              timestamp
            );
          }

          // Emit the email event (include total)
          await pusherService.trigger(`${sessionId}`, 'email-sync', {
            email: {
              id: emailObj.id,
              snippet: emailObj.snippet,
              subject: emailObj.payload?.headers?.find(h => h.name === 'Subject')?.value,
              from: emailObj.payload?.headers?.find(h => h.name === 'From')?.value,
              date: emailObj.internalDate,
              inferences: inferences
            },
            total: emails.length
          });
        } catch (e) {
          console.error('Error processing email:', e);
        }
      }
    );

    // Emit completion event
    await pusherService.trigger(`${sessionId}`, 'sync-complete', {
      totalProcessed: emails.length,
      totalEmails: emails.length
    });

    console.log(`Successfully processed ${emails.length} emails for session: ${sessionId}`);
    res.json({ status: 'success', totalProcessed: emails.length });
  } catch (err) {
    console.error('Error in /api/gmail/sync:', err);
    res.status(500).json({ error: 'Failed to fetch emails', details: err instanceof Error ? err.message : err });
  }
});

// Add Pusher authentication endpoint
app.post('/api/pusher/auth', (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  const sessionId = getSessionId(req);

  // Only allow authentication for the user's own channel
  if (!channel?.startsWith(`${sessionId}`)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const authResponse = pusherService.authenticate(socketId, channel);
    res.send(authResponse);
  } catch (error) {
    console.error('Error authenticating Pusher channel:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/api/zep/read', async (req, res) => {
  const sessionId = getSessionId(req);
  console.log(`Reading Zep memories for session: ${sessionId}`);
  try {
    const memories = await zepService.getSessionMessages(sessionId);
    console.log(`Retrieved ${memories?.messages?.length || 0} memories for session: ${sessionId}`);
    res.json(memories);
  } catch (err) {
    console.error('Error reading from Zep:', err);
    res.status(500).json({ error: 'Failed to read from memory', details: err instanceof Error ? err.message : err });
  }
});

app.post('/api/zep/query', async (req, res) => {
  const sessionId = getSessionId(req);
  const { query, limit = 10 } = req.body;
  console.log(`Processing Zep query for session: ${sessionId} - Query: "${query}"`);
  
  if (!query) {
    console.error('Missing query parameter in Zep query');
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const searchResults = await zepService.searchGraph(query, sessionId, limit);
    console.log(`Found ${searchResults.edges?.length || 0} relevant memories for query`);
    const edges = searchResults.edges || [];
    const formattedMemories = edges.map(edge => ({
      content: edge.fact,
      metadata: {
        source: edge.name || 'unknown',
        timestamp: edge.createdAt,
        score: 1.0
      },
      relevance: 1.0
    }));

    const wordwareData = await wordwareService.answerQuestion(query, formattedMemories);
    const answer = wordwareData?.data?.attributes?.outputs?.Answer?.answer || '';

    res.json({
      answer,
      memories: formattedMemories
    });
  } catch (err) {
    console.error('Error querying memory:', err);
    res.status(500).json({ error: 'Failed to query memory', details: err instanceof Error ? err.message : err });
  }
});

app.post('/api/mock-agent', async (req, res) => {
  const sessionId = getSessionId(req);
  try {
    const episodes = await zepService.getEpisodesByUserId(sessionId);
    let userEmail = sessionId;
    
    try {
      const user = await zepService.getUser(sessionId);
      if (user && user.email) {
        userEmail = user.email;
      }
    } catch (e) {
      // If user not found, fallback to sessionId
    }

    const wordwareData = await wordwareService.suggestAgents(episodes as any[], userEmail);
    const suggestions = wordwareData?.data?.attributes?.outputs?.['Suggested Agents']?.suggested || [];

    res.json(suggestions);
  } catch (err) {
    console.error('Error generating agent suggestions:', err);
    res.status(500).json({ error: 'Failed to generate agent suggestions', details: err instanceof Error ? err.message : err });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 