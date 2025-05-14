// Utility for per-user Zep sessionId
export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem('agentic-session-id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('agentic-session-id', sessionId);
  }
  return sessionId;
}

export function resetSessionId(): string {
  localStorage.removeItem('agentic-session-id');
  return getOrCreateSessionId();
} 