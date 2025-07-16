import { Router } from 'express';
import { AIService } from '../services/ai.service';
import { pusherService } from '../services/pusher.service';
import { getSessionId } from '../utils/session.utils';
import { transformEmailForAI } from '../utils/email-transform.utils';

const router = Router();

// Extract insights from a single email (step 2)
router.post('/extract-insights', async (req, res) => {
  const { tokens, emailId, emailData, userInfo } = req.body;
  const sessionId = getSessionId(req);
  if (!tokens || !emailId || !emailData) {
    return res.status(400).json({ error: 'Missing tokens, emailId, or emailData' });
  }

  try {
    await pusherService.trigger(`${sessionId}`, 'insights-start', { emailId });

    // Convert frontend email format to the format expected by AI service
    const targetEmail = transformEmailForAI(emailData);

    // Use the combined classification + extraction method
    const aiService = new AIService();
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

// Extract insights from multiple emails in a batch (step 2 - batched)
router.post('/extract-insights-batch', async (req, res) => {
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
    const aiService = new AIService();
    const results = await Promise.all(
      emails.map(async (emailData, index) => {
        try {
          // Convert frontend email format to the format expected by AI service
          const targetEmail = transformEmailForAI(emailData);

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

export default router; 