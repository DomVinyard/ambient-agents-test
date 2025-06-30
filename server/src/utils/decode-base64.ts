/**
 * Decode base64url encoded content from Gmail
 * Gmail uses base64url encoding (- instead of +, _ instead of /)
 */
export function decodeBase64(data: string): string {
  try {
    // Gmail uses base64url encoding (replace - with + and _ with /)
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    return Buffer.from(padded, 'base64').toString('utf-8');
  } catch (error) {
    console.error('Error decoding base64 content:', error);
    return '';
  }
} 