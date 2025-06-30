import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { GmailService } from './services/gmail.service';
import { ZepService } from './services/zep.service';
import { AIService } from './services/ai.service';
import { pusherService } from './services/pusher.service';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const WORDWARE_CONCURRENCY_LIMIT = 100;

// Check if OpenAI API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.error('⚠️  WARNING: OPENAI_API_KEY is not set in environment variables!');
  console.error('   AI features will not work without this key.');
} else {
  console.log('✅ OpenAI API key is configured');
}

// Initialize services
const gmailService = new GmailService();
const zepService = new ZepService();
const aiService = new AIService();

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
          const aiResult = await aiService.processMessage(emailObj, email);
          const inferences = aiResult?.inferences || [];

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

app.post('/api/gmail/basic-profile', async (req, res) => {
  const { tokens } = req.body;
  const sessionId = getSessionId(req);
  console.log(`Creating basic profile for session: ${sessionId}`);

  if (!tokens) {
    console.error('No tokens provided for basic profile');
    return res.status(400).json({ error: 'Missing tokens' });
  }

  try {
    // Emit start event
    await pusherService.trigger(`${sessionId}`, 'profile-start', {
      total: 10
    });

    // Fetch recent emails (limit to 10 for basic profile)
    const { email, firstName, lastName, emails } = await gmailService.syncEmails(tokens);
    
    // Get the latest 10 emails
    const recentEmails = emails.slice(0, 10);
    
    console.log(`Processing ${recentEmails.length} recent emails for basic profile`);
    
    // Process emails to extract insights
    const allInsights: any[] = [];
    console.log('Starting to process emails with AI...');
    for (let i = 0; i < recentEmails.length; i++) {
      const emailObj = recentEmails[i];
      try {
        const subject = emailObj.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || 'No subject';
        console.log(`Processing email ${i + 1}/${recentEmails.length} - Subject: ${subject}`);
        
        // Emit processing event
        await pusherService.trigger(`${sessionId}`, 'profile-processing', {
          current: i + 1,
          total: recentEmails.length,
          subject: subject
        });
        
        const aiResult = await aiService.processMessage(emailObj, email);
        console.log(`Email ${i + 1} processed - Insights found: ${aiResult.inferences?.length || 0}`);
        
        if (aiResult.inferences && aiResult.inferences.length > 0) {
          allInsights.push(...aiResult.inferences);
        }
      } catch (e) {
        console.error(`Error processing email ${i + 1} for basic profile:`, e);
      }
    }
    console.log(`Finished processing emails. Total insights extracted: ${allInsights.length}`);

    // Emit generating event
    await pusherService.trigger(`${sessionId}`, 'profile-generating', {
      totalInsights: allInsights.length
    });

    // Generate markdown profile content
    const profileContent = generateMarkdownProfile(email, firstName, lastName, allInsights, recentEmails.length);
    
    console.log(`Generated basic profile with ${allInsights.length} insights`);
    
    // Emit completion event
    await pusherService.trigger(`${sessionId}`, 'profile-complete', {
      totalInsights: allInsights.length,
      totalEmails: recentEmails.length
    });
    
    res.json({ 
      profileContent,
      totalEmailsProcessed: recentEmails.length,
      totalInsights: allInsights.length
    });

  } catch (err) {
    console.error('Error creating basic profile:', err);
    
    // Emit error event
    await pusherService.trigger(`${sessionId}`, 'profile-error', {
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    
    res.status(500).json({ error: 'Failed to create basic profile', details: err instanceof Error ? err.message : err });
  }
});

// Helper function to generate markdown profile
function generateMarkdownProfile(email: string, firstName: string, lastName: string, insights: any[], emailCount: number): string {
  const now = new Date().toLocaleString();
  
  // Group insights by category
  const categorizedInsights: Record<string, any[]> = {};
  insights.forEach(insight => {
    const category = insight.category || 'general';
    if (!categorizedInsights[category]) {
      categorizedInsights[category] = [];
    }
    categorizedInsights[category].push(insight);
  });

  let markdown = `# Basic Profile\n\n`;
  markdown += `**Generated:** ${now}  \n`;
  markdown += `**Email:** ${email}  \n`;
  markdown += `**Name:** ${firstName} ${lastName}  \n`;
  markdown += `**Source:** ${emailCount} recent emails  \n\n`;

  markdown += `## Summary\n\n`;
  markdown += `This profile was automatically generated by analyzing ${emailCount} recent emails. `;
  markdown += `A total of ${insights.length} insights were extracted across ${Object.keys(categorizedInsights).length} categories.\n\n`;

  // Add insights by category
  const categoryOrder = ['professional', 'personal', 'communication', 'behavioral', 'technical', 'general'];
  const sortedCategories = [...new Set([...categoryOrder, ...Object.keys(categorizedInsights)])];

  sortedCategories.forEach(category => {
    if (categorizedInsights[category] && categorizedInsights[category].length > 0) {
      const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
      markdown += `## ${categoryTitle}\n\n`;
      
      categorizedInsights[category].forEach(insight => {
        markdown += `- **${insight.insight}**\n`;
        if (insight.evidence) {
          markdown += `  *Evidence: ${insight.evidence}*\n`;
        }
        if (insight.confidence) {
          markdown += `  *Confidence: ${Math.round(insight.confidence * 100)}%*\n`;
        }
        markdown += `\n`;
      });
    }
  });

  markdown += `## Notes\n\n`;
  markdown += `This profile is automatically generated and should be reviewed for accuracy. `;
  markdown += `You can edit this file to add additional information or correct any inaccuracies.\n\n`;
  markdown += `Last updated: ${now}`;

  return markdown;
}

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



// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 