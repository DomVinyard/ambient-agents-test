import { Router } from 'express';
import { GmailService } from '../services/gmail.service';

const router = Router();

// Gmail OAuth flow - Admin only
router.get('/gmail', (req, res) => {
  const mode = 'admin'; // Only admin mode supported
  console.log(`Starting Gmail OAuth flow for admin mode`);
  const gmailService = new GmailService();
  const url = gmailService.generateAuthUrl(mode);
  res.redirect(url);
});

// OAuth callback - Admin only
router.get('/gmail/callback', async (req, res) => {
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
    const gmailService = new GmailService();
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



export default router; 