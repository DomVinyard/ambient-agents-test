import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { GmailService } from './services/gmail.service';
import { AIService } from './services/ai.service';
import { pusherService } from './services/pusher.service';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Check if OpenAI API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.error('⚠️  WARNING: OPENAI_API_KEY is not set in environment variables!');
  console.error('   AI features will not work without this key.');
} else {
  console.log('✅ OpenAI API key is configured');
}

// Initialize services
const gmailService = new GmailService();
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Gmail OAuth flow
app.get('/auth/gmail', (req, res) => {
  console.log('Starting Gmail OAuth flow');
  const url = gmailService.generateAuthUrl();
  res.redirect(url);
});

// OAuth callback
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

// Pusher authentication endpoint
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

// Fetch emails endpoint (step 1)
app.post('/api/gmail/fetch-emails', async (req, res) => {
  const { tokens, sentCount, receivedCount } = req.body;
  const sessionId = getSessionId(req);
  console.log(`Fetching emails for session: ${sessionId}, sent: ${sentCount || 'default'}, received: ${receivedCount || 'default'}`);

  if (!tokens) {
    console.error('No tokens provided for email fetch');
    return res.status(400).json({ error: 'Missing tokens' });
  }

  try {
    await pusherService.trigger(`${sessionId}`, 'fetch-start', {});

    const { email, firstName, lastName, emails } = await gmailService.syncEmails(tokens, {
      sentCount,
      receivedCount,
      progressCallback: async (fetched: number, total: number) => {
        await pusherService.trigger(`${sessionId}`, 'fetch-progress', {
          fetched,
          total
        });
      }
    });
    
    // Gmail service already limits the emails based on EMAIL_FETCH_LIMIT
    const recentEmails = emails;
    
         // Format emails for the frontend
     const formattedEmails = recentEmails.map(emailObj => {
       const headers = emailObj.payload?.headers || [];
       const internalDate = emailObj.internalDate ? parseInt(emailObj.internalDate) : Date.now();
       return {
         id: emailObj.id,
         subject: headers.find((h: any) => h.name === 'Subject')?.value || 'No subject',
         from: headers.find((h: any) => h.name === 'From')?.value || '',
         to: headers.find((h: any) => h.name === 'To')?.value || '',
         cc: headers.find((h: any) => h.name === 'Cc')?.value || '',
         date: new Date(internalDate).toISOString(),
         internalDate: internalDate,
         snippet: emailObj.snippet || '',
         fullBody: emailObj.fullBody || '',
         threadId: emailObj.threadId,
         labelIds: emailObj.labelIds || [],
         emailType: emailObj.emailType || 'unknown'
       };
     });

     // Deduplicate by thread - keep only the most recent email from each thread
     const threadMap = new Map();
     formattedEmails.forEach(email => {
       const existing = threadMap.get(email.threadId);
       if (!existing || email.internalDate > existing.internalDate) {
         threadMap.set(email.threadId, email);
       }
     });
     
     const deduplicatedEmails = Array.from(threadMap.values()).map(email => {
       // Remove internalDate from final output as it's only needed for sorting
       const { internalDate, ...emailWithoutInternalDate } = email;
       return emailWithoutInternalDate;
     });

         const inboxCount = deduplicatedEmails.filter(e => e.emailType === 'inbox').length;
     const sentEmailCount = deduplicatedEmails.filter(e => e.emailType === 'sent').length;
     
     await pusherService.trigger(`${sessionId}`, 'fetch-complete', {
       totalEmails: deduplicatedEmails.length,
       inboxCount,
       sentCount: sentEmailCount
     });
     
     res.json({ 
       emails: deduplicatedEmails,
       userInfo: { email, firstName, lastName }
     });

  } catch (err) {
    console.error('Error fetching emails:', err);
    await pusherService.trigger(`${sessionId}`, 'fetch-error', {
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to fetch emails', details: err instanceof Error ? err.message : err });
  }
});

// Extract insights from a single email (step 2)
app.post('/api/gmail/extract-insights', async (req, res) => {
  const { tokens, emailId, emailData } = req.body;
  const sessionId = getSessionId(req);
  console.log(`Extracting insights for email ${emailId}, session: ${sessionId}`);

  if (!tokens || !emailId || !emailData) {
    return res.status(400).json({ error: 'Missing tokens, emailId, or emailData' });
  }

  try {
    await pusherService.trigger(`${sessionId}`, 'insights-start', { emailId });

    // Convert frontend email format to the format expected by AI service
    const targetEmail = {
      id: emailData.id,
      snippet: emailData.snippet,
      fullBody: emailData.fullBody,
      internalDate: new Date(emailData.date).getTime().toString(),
      labelIds: emailData.labelIds || [],
      emailType: emailData.emailType || 'unknown', // Ensure emailType is passed through
      threadId: emailData.threadId,
      payload: {
        headers: [
          { name: 'Subject', value: emailData.subject },
          { name: 'From', value: emailData.from },
          { name: 'To', value: emailData.to || '' },
          { name: 'Cc', value: emailData.cc || '' },
          { name: 'Date', value: emailData.date }
        ]
      }
    };

    // Use placeholder for AI processing (actual user email not needed for insight extraction)
    const aiResult = await aiService.processMessage(targetEmail, 'user');
    
    await pusherService.trigger(`${sessionId}`, 'insights-complete', {
      emailId,
      insightsCount: aiResult.inferences?.length || 0
    });
    
    res.json({ 
      insights: aiResult.inferences || [],
      emailId 
    });

  } catch (err) {
    console.error('Error extracting insights:', err);
    await pusherService.trigger(`${sessionId}`, 'insights-error', {
      emailId,
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to extract insights', details: err instanceof Error ? err.message : err });
  }
});

// Blend profile content with AI (step 3)
app.post('/api/ai/blend-profile', async (req, res) => {
  const { tokens, category, newInsights, existingContent, userInfo } = req.body;
  const sessionId = getSessionId(req);
  console.log(`Blending profile for category: ${category}, session: ${sessionId}`);

  if (!tokens || !category || !newInsights || !userInfo) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    await pusherService.trigger(`${sessionId}`, 'blend-start', { category });

    const blendedContent = await aiService.blendProfile({
      category,
      newInsights,
      existingContent,
      userInfo
    });
    
    await pusherService.trigger(`${sessionId}`, 'blend-complete', {
      category,
      wordCount: blendedContent.split(' ').length
    });
    
    res.json({ content: blendedContent });

  } catch (err) {
    console.error('Error blending profile:', err);
    await pusherService.trigger(`${sessionId}`, 'blend-error', {
      category,
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to blend profile', details: err instanceof Error ? err.message : err });
  }
});

// Compile all profile files into a comprehensive profile (new endpoint)
app.post('/api/ai/compile-profile', async (req, res) => {
  const { tokens, profileFiles, userInfo } = req.body;
  const sessionId = getSessionId(req);
  console.log(`Compiling profile for session: ${sessionId}, files: ${Object.keys(profileFiles).join(', ')}`);

  if (!tokens || !profileFiles || !userInfo) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    await pusherService.trigger(`${sessionId}`, 'compile-start', { 
      fileCount: Object.keys(profileFiles).length 
    });

    const compiledContent = await aiService.compileProfile({
      profileFiles,
      userInfo
    });
    
    await pusherService.trigger(`${sessionId}`, 'compile-complete', {
      wordCount: compiledContent.split(' ').length
    });
    
    res.json({ content: compiledContent });

  } catch (err) {
    console.error('Error compiling profile:', err);
    await pusherService.trigger(`${sessionId}`, 'compile-error', {
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to compile profile', details: err instanceof Error ? err.message : err });
  }
});

// Analyze automation opportunities from profile files (new endpoint)
app.post('/api/ai/analyze-automation', async (req, res) => {
  const { tokens, profileFiles, userInfo } = req.body;
  const sessionId = getSessionId(req);
  console.log(`Analyzing automation opportunities for session: ${sessionId}, files: ${Object.keys(profileFiles).join(', ')}`);

  if (!tokens || !profileFiles || !userInfo) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    await pusherService.trigger(`${sessionId}`, 'automation-start', { 
      fileCount: Object.keys(profileFiles).length 
    });

    const automationContent = await aiService.analyzeAutomation({
      profileFiles,
      userInfo
    });
    
    await pusherService.trigger(`${sessionId}`, 'automation-complete', {
      wordCount: automationContent.split(' ').length
    });
    
    res.json({ content: automationContent });

  } catch (err) {
    console.error('Error analyzing automation opportunities:', err);
    await pusherService.trigger(`${sessionId}`, 'automation-error', {
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to analyze automation opportunities', details: err instanceof Error ? err.message : err });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 