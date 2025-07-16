import { Router } from 'express';
import { GmailService } from '../services/gmail.service';
import { pusherService } from '../services/pusher.service';
import { getSessionId } from '../utils/session.utils';

const router = Router();

// Fetch emails endpoint (step 1)
router.post('/fetch-emails', async (req, res) => {
  const { tokens, sentCount, receivedCount } = req.body;
  const sessionId = getSessionId(req);
  console.log(`Fetching emails for session: ${sessionId}, sent: ${sentCount || 'default'}, received: ${receivedCount || 'default'}`);

  if (!tokens) {
    console.error('No tokens provided for email fetch');
    return res.status(400).json({ error: 'Missing tokens' });
  }

  try {
    const gmailService = new GmailService();
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

export default router; 