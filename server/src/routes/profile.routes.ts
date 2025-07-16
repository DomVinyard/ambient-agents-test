import { Router } from 'express';
import { AIService } from '../services/ai.service';
import { pusherService } from '../services/pusher.service';
import { getSessionId } from '../utils/session.utils';

const router = Router();

// Blend profile content with AI (step 3)
router.post('/blend-profile', async (req, res) => {
  const { tokens, category, newInsights, existingContent, userInfo } = req.body;
  const sessionId = getSessionId(req);

  if (!tokens || !category || !newInsights || !userInfo) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    await pusherService.trigger(`${sessionId}`, 'blend-start', { category });

    const aiService = new AIService();
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

// Compile all profile files into a comprehensive profile
router.post('/compile-profile', async (req, res) => {
  const { tokens, profileFiles, userInfo } = req.body;
  const sessionId = getSessionId(req);
  if (!tokens || !profileFiles || !userInfo) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    await pusherService.trigger(`${sessionId}`, 'compile-start', { 
      fileCount: Object.keys(profileFiles).length 
    });

    const aiService = new AIService();
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

// Analyze profile files for automation opportunities
router.post('/analyze-automation', async (req, res) => {
  const { tokens, profileFiles, userInfo } = req.body;
  const sessionId = getSessionId(req);
  if (!tokens || !profileFiles || !userInfo) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    await pusherService.trigger(`${sessionId}`, 'automation-start', { 
      fileCount: Object.keys(profileFiles).length 
    });

    const aiService = new AIService();
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

export default router; 