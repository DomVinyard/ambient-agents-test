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
    res.redirect(`http://localhost:3000/?gmail=success&tokens=${tokensParam}`);
  } catch (err) {
    console.error('Error in OAuth callback:', err);
    res.redirect('http://localhost:3000/?gmail=error');
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
    let userEmail = sessionId;
    
    try {
      const user = await zepService.getUser(sessionId);
      if (user && user.email) {
        userEmail = user.email;
      }
    } catch (e) {
      // If user not found, fallback to sessionId
    }

    const wordwareData = await wordwareService.suggestAgents(sessionId, userEmail);
    const suggestions = wordwareData?.data?.attributes?.outputs?.['Suggested Agents']?.suggested || [];

    res.json(suggestions);
  } catch (err) {
    console.error('Error generating agent suggestions:', err);
    res.status(500).json({ error: 'Failed to generate agent suggestions', details: err instanceof Error ? err.message : err });
  }
});

app.post('/api/simulate-actions', async (req, res) => {
  try {
    const { activeAgents } = req.body;
    const sessionId = getSessionId(req);
    
    // Check if active agents array exists
    if (!activeAgents || !Array.isArray(activeAgents)) {
      console.warn(`Missing or invalid activeAgents array for session ${sessionId}, using empty array`);
    }
    
    // Use an empty array if not provided or invalid
    const agents = Array.isArray(activeAgents) ? activeAgents : [];
    console.log(`Simulating actions with ${agents.length} active agents for session: ${sessionId}`);
    
    // Call Wordware service
    const wordwareData = await wordwareService.simulateActions(agents);
    const actions = wordwareData?.data?.attributes?.outputs?.Actions?.actions || [];
    
    console.log(`Received ${actions.length} actions from Wordware for session: ${sessionId}`);
    
    // If no actions were returned, create mock actions
    if (!actions.length) {
      console.log("No actions returned from Wordware, generating mock actions");
      
      // Generate mock actions based on the available agents or default ones if no agents
      const mockActions = generateMockActions(agents);
      return res.json(mockActions);
    }
    
    // Send the actions to the client
    res.json(actions);
  } catch (err) {
    console.error('Error simulating actions:', err);
    
    // On error, return mock actions as fallback
    console.log("Error occurred, returning mock actions as fallback");
    const agents = req.body.activeAgents || [];
    const mockActions = generateMockActions(agents);
    return res.json(mockActions);
  }
});

// Helper function to generate mock actions
function generateMockActions(agents: any[]) {
  const actionTypes = ['simple_confirm', 'decision', 'supply_info', 'edit_info'];
  const numActions = Math.min(10, Math.max(3, agents.length * 2)); // 3-10 actions based on number of agents
  
  return Array.from({ length: numActions }, (_, index) => {
    const type = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    const useAgent = agents.length > 0 ? Math.random() > 0.3 : false; // 70% chance to use an agent if available
    const agent = useAgent ? agents[Math.floor(Math.random() * agents.length)] : null;
    
    const action: any = {
      id: `mock-${Date.now()}-${index}`,
      type,
      text: `${agent ? 'Agent ' + (agent.title || agent.name || agent.id) : 'System'} ${actionVerb(type)}`
    };
    
    if (agent) {
      action.agent_id = agent.id || agent.title || 'unknown';
    }
    
    // Add type-specific properties
    if (type === 'decision') {
      action.options = generateOptions(type, agent);
    } else if (type === 'edit_info') {
      action.text_to_edit = generateTextToEdit(agent);
    }
    
    return action;
  });
}

// Helper to generate a verb based on action type
function actionVerb(type: string): string {
  switch (type) {
    case 'simple_confirm':
      return `needs confirmation for ${randomItem([
        'processing an email',
        'archiving old messages',
        'setting up a reminder',
        'creating a task',
        'configuring a notification'
      ])}`;
    case 'decision':
      return `requests your decision on ${randomItem([
        'how to categorize emails',
        'priority level for a task',
        'scheduling preferences',
        'notification settings',
        'handling a recurring event'
      ])}`;
    case 'supply_info':
      return `needs additional information about ${randomItem([
        'your availability next week',
        'your preferences for email handling',
        'details for an upcoming meeting',
        'how to respond to a specific contact',
        'your goals for task automation'
      ])}`;
    case 'edit_info':
      return `suggests edits to ${randomItem([
        'a draft email response',
        'meeting notes',
        'a task description',
        'a contact information entry',
        'a scheduled reminder'
      ])}`;
    default:
      return 'requires your attention';
  }
}

// Helper to generate options for decision type
function generateOptions(type: string, agent: any): string[] {
  if (type === 'decision') {
    if (agent && agent.title && agent.title.includes('Email')) {
      return ['Archive messages', 'Mark as important', 'Create a filter', 'Ignore future messages'];
    } else if (agent && agent.title && agent.title.includes('Schedule')) {
      return ['Morning slot', 'Afternoon slot', 'Evening slot', 'Next business day'];
    } else {
      return ['Option A', 'Option B', 'Option C'];
    }
  }
  return [];
}

// Helper to generate text for edit_info type
function generateTextToEdit(agent: any): string {
  if (agent && agent.title && agent.title.includes('Email')) {
    return `Dear [Contact],\n\nThank you for your message. I've reviewed the information you shared and would like to discuss further.\n\nLet me know if you're available for a quick call tomorrow.\n\nBest regards,\n[Your Name]`;
  } else if (agent && agent.title && agent.title.includes('Meeting')) {
    return `Meeting Notes - Project Status\n\n- Completed initial research phase\n- Technical implementation delayed by 2 days\n- Client feedback generally positive\n- Next steps: finalize design by Thursday`;
  } else {
    return `This is placeholder text that needs to be edited. Please review and make any necessary changes to improve clarity and accuracy.`;
  }
}

// Helper to pick a random item from an array
function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 