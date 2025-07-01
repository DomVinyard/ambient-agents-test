import { decodeBase64 } from './decode-base64';
import { cleanHtmlContent } from './clean-html-content';

/**
 * Extract email body content from Gmail payload, handling multipart and base64 encoding
 * Supports both single-part and multipart emails, prefers plain text over HTML
 */
export function extractEmailBody(payload: any): string {
  if (!payload) return '';

  // If the email has a single body (not multipart)
  if (payload.body?.data) {
    const decodedContent = decodeBase64(payload.body.data);
    
    // Check if this is HTML content that needs cleaning
    if (payload.mimeType === 'text/html' || decodedContent.includes('<') || decodedContent.includes('&')) {
      return cleanHtmlContent(decodedContent);
    }
    
    return decodedContent;
  }

  // If the email has multiple parts (multipart)
  if (payload.parts && Array.isArray(payload.parts)) {
    let textContent = '';
    let htmlContent = '';

    // Recursively extract content from all parts
    const extractFromParts = (parts: any[]): void => {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          textContent += decodeBase64(part.body.data) + '\n';
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          htmlContent += decodeBase64(part.body.data) + '\n';
        } else if (part.parts && Array.isArray(part.parts)) {
          // Recursively handle nested parts (e.g., multipart/alternative)
          extractFromParts(part.parts);
        }
      }
    };

    extractFromParts(payload.parts);

    // Prefer plain text, fallback to cleaned HTML, then snippet
    if (textContent.trim()) {
      return textContent.trim();
    } else if (htmlContent.trim()) {
      return cleanHtmlContent(htmlContent);
    }
  }

  return '';
} 