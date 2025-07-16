/**
 * Helper to get sessionId from request
 */
export function getSessionId(req: any): string {
  return req.body?.sessionId || req.query?.sessionId || 'default';
} 