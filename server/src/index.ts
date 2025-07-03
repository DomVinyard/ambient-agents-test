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
app.use(express.json({ limit: '50mb' })); // Increased limit for batch email processing

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

// Gmail OAuth flow - Admin only
app.get('/auth/gmail', (req, res) => {
  const mode = 'admin'; // Only admin mode supported
  console.log(`Starting Gmail OAuth flow for admin mode`);
  const url = gmailService.generateAuthUrl(mode);
  res.redirect(url);
});

// OAuth callback - Admin only
app.get('/auth/gmail/callback', async (req, res) => {
  console.log('Received OAuth callback');
  const code = req.query.code as string;
  const state = req.query.state as string;
  
  if (!code) {
    console.error('OAuth callback missing code parameter');
    return res.status(400).send('Missing code');
  }
  
  // Always admin mode
  const mode = 'admin';
  
  try {
    const { tokens } = await gmailService.getToken(code);
    console.log(`Successfully obtained Gmail tokens for admin mode`);
    const tokensParam = encodeURIComponent(JSON.stringify(tokens));
    
    // Always redirect to admin
    res.redirect(`http://localhost:3000/admin?gmail=success&tokens=${tokensParam}&mode=${mode}`);
  } catch (err) {
    console.error('Error in OAuth callback:', err);
    // Always redirect to admin error page
    res.redirect('http://localhost:3000/admin?gmail=error');
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
    
    // Format emails for the frontend without classification (classification moved to extract-insights stage)
    const formattedEmails = recentEmails.map((emailObj) => {
      const headers = emailObj.payload?.headers || [];
      const internalDate = emailObj.internalDate ? parseInt(emailObj.internalDate) : Date.now();
      
      return {
        id: emailObj.id,
        subject: headers.find((h: any) => h.name === 'Subject')?.value || 'No subject',
        from: headers.find((h: any) => h.name === 'From')?.value || '',
        to: headers.find((h: any) => h.name === 'To')?.value || '',
        cc: headers.find((h: any) => h.name === 'Cc')?.value || '',
        date: new Date(internalDate).toISOString(),
        snippet: emailObj.snippet || '',
        fullBody: emailObj.fullBody || '',
        threadId: emailObj.threadId,
        labelIds: emailObj.labelIds || [],
        emailType: emailObj.emailType || 'unknown'
        // No classification field - will be added during extract-insights
      };
    });
    
     // Deduplicate by thread - keep only the most recent email from each thread
     const threadMap = new Map();
     formattedEmails.forEach(email => {
       const existing = threadMap.get(email.threadId);
       if (!existing || new Date(email.date).getTime() > new Date(existing.date).getTime()) {
         threadMap.set(email.threadId, email);
       }
     });
     
     const deduplicatedEmails = Array.from(threadMap.values());

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
  const { tokens, emailId, emailData, userInfo } = req.body;
  const sessionId = getSessionId(req);
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
      classification: emailData.classification, // Pass through classification for proper prompt routing
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

    // Use the combined classification + extraction method
    const result = await aiService.extractInsightsWithClassification(targetEmail, userInfo);
    
    await pusherService.trigger(`${sessionId}`, 'insights-complete', {
      emailId,
      insightsCount: result.insights?.length || 0
    });
    
    res.json({ 
      insights: result.insights || [],
      classification: result.classification || null,
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

// NEW: Extract insights from multiple emails in a batch (step 2 - batched)
app.post('/api/gmail/extract-insights-batch', async (req, res) => {
  const { tokens, emails, userInfo } = req.body;
  const sessionId = getSessionId(req);
  
  if (!tokens || !emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'Missing tokens, emails array, or empty batch' });
  }

  console.log(`🚀 Processing batch of ${emails.length} emails for session: ${sessionId}`);

  try {
    await pusherService.trigger(`${sessionId}`, 'batch-insights-start', { 
      batchSize: emails.length 
    });

    // Process all emails in parallel with proper error handling
    const results = await Promise.all(
      emails.map(async (emailData, index) => {
        try {
          // Convert frontend email format to the format expected by AI service
          const targetEmail = {
            id: emailData.id,
            snippet: emailData.snippet,
            fullBody: emailData.fullBody,
            internalDate: new Date(emailData.date).getTime().toString(),
            labelIds: emailData.labelIds || [],
            emailType: emailData.emailType || 'unknown',
            threadId: emailData.threadId,
            classification: emailData.classification,
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

          // Use the combined classification + extraction method
          const result = await aiService.extractInsightsWithClassification(targetEmail, userInfo);
          
          // Send progress update for this individual email
          await pusherService.trigger(`${sessionId}`, 'batch-insights-progress', {
            emailId: emailData.id,
            processed: index + 1,
            total: emails.length,
            subject: emailData.subject.substring(0, 50)
          });

          return {
            emailId: emailData.id,
            insights: result.insights || [],
            classification: result.classification || null,
            success: true,
            error: null
          };

        } catch (error: any) {
          console.error(`❌ Failed to extract insights from email "${emailData.subject}":`, error?.message);
          
          return {
            emailId: emailData.id,
            insights: [],
            classification: null,
            success: false,
            error: error?.message || 'Unknown error'
          };
        }
      })
    );

    // Calculate success stats
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    const totalInsights = results.reduce((sum, r) => sum + r.insights.length, 0);

    await pusherService.trigger(`${sessionId}`, 'batch-insights-complete', {
      batchSize: emails.length,
      successful,
      failed,
      totalInsights
    });

    console.log(`✅ Batch complete: ${successful}/${emails.length} emails processed, ${totalInsights} insights extracted`);
    
    res.json({ 
      results,
      stats: {
        total: emails.length,
        successful,
        failed,
        totalInsights
      }
    });

  } catch (err) {
    console.error('Error in batch insights extraction:', err);
    await pusherService.trigger(`${sessionId}`, 'batch-insights-error', {
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to process batch', details: err instanceof Error ? err.message : err });
  }
});

// Blend profile content with AI (step 3)
app.post('/api/ai/blend-profile', async (req, res) => {
  const { tokens, category, newInsights, existingContent, userInfo } = req.body;
  const sessionId = getSessionId(req);

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

// Analyze profile files for automation opportunities (new endpoint)
app.post('/api/ai/analyze-automation', async (req, res) => {
  const { tokens, profileFiles, userInfo } = req.body;
  const sessionId = getSessionId(req);
  if (!tokens || !profileFiles || !userInfo) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    await pusherService.trigger(`${sessionId}`, 'automation-start', { 
      fileCount: Object.keys(profileFiles).length 
    });

    const automationData = await aiService.analyzeAutomation({
      profileFiles,
      userInfo
    });
    
    await pusherService.trigger(`${sessionId}`, 'automation-complete', {
      automationCount: automationData.automations.length
    });
    
    res.json(automationData);

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