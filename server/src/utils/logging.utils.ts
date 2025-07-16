import { Request, Response, NextFunction } from 'express';
import { getSessionId } from './session.utils';

/**
 * Request logging middleware
 */
export function requestLogging(req: Request, res: Response, next: NextFunction) {
  const sessionId = getSessionId(req);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Session: ${sessionId}`);
  next();
} 