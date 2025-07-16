import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { EXPRESS_JSON_LIMIT } from './consts';

// Route modules
import authRoutes from './routes/auth.routes';
import gmailRoutes from './routes/gmail.routes';
import insightsRoutes from './routes/insights.routes';
import profileRoutes from './routes/profile.routes';

// Middleware
import { requestLogging } from './utils/logging.utils';

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

// Global middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: EXPRESS_JSON_LIMIT })); // Increased limit for batch email processing
app.use(requestLogging);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Pusher authentication endpoint (utility endpoint)
app.post('/api/pusher/auth', (req, res) => {
  const { pusherService } = require('./services/pusher.service');
  const { getSessionId } = require('./utils/session.utils');
  
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

// Route registration
app.use('/auth', authRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/ai', profileRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 