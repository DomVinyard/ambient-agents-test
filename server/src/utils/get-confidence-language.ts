/**
 * Convert confidence score to natural language modifier
 * Maps numerical confidence (0-1) to appropriate qualifying language
 */
export function getConfidenceLanguage(confidence: number): string {
  if (confidence >= 0.9) return 'very confident';
  if (confidence >= 0.8) return 'confident';
  if (confidence >= 0.7) return 'likely';
  if (confidence >= 0.6) return 'probably';
  if (confidence >= 0.5) return 'possibly';
  return 'may';
} 