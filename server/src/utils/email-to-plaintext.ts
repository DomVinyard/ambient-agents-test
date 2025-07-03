import { convert } from 'html-to-text';

/**
 * Consolidated email processing utility
 * Takes a Gmail email object and returns clean, readable plain text
 * Handles all Gmail formats: multipart, base64, HTML, plain text
 */

/**
 * Decode base64url encoded content from Gmail
 * Gmail uses base64url encoding (- instead of +, _ instead of /)
 */
function decodeBase64(data: string): string {
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

/**
 * Extract email body content from Gmail payload
 * Handles both single-part and multipart emails
 */
function extractBodyFromPayload(payload: any): string {
  if (!payload) return '';

  // If the email has a single body (not multipart)
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
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

    // Prefer plain text, fallback to HTML
    if (textContent.trim()) {
      return textContent.trim();
    } else if (htmlContent.trim()) {
      return htmlContent.trim();
    }
  }

  return '';
}

/**
 * Clean any content (HTML or plain text) using html-to-text
 * The library handles both formats effectively
 */
function cleanContent(content: string): string {
  try {
    const text = convert(content, {
      wordwrap: 80,
      preserveNewlines: false,
      selectors: [
        // Skip common noise elements
        { selector: 'style', format: 'skip' },
        { selector: 'script', format: 'skip' },
        { selector: 'img', format: 'skip' },
        { selector: 'head', format: 'skip' },
        { selector: 'meta', format: 'skip' },
        // Keep link text but disable href URLs and brackets
        { selector: 'a', options: { ignoreHref: true, linkBrackets: false } }
      ]
    });

    // Post-process to clean up remaining marketing email junk
    const cleanedText = text
      // Remove lines that are just invisible characters and spaces
      .replace(/^[\s‌\u200B\u200C\u200D\uFEFF]*$/gm, '')
      // Remove CSS that leaked through (like "body, table, td {font-family: Arial...}")
      .replace(/[a-zA-Z,\s]+\{[^}]*\}/g, '')
      // Replace long URLs that appear in text content with [Link]
      .replace(/https?:\/\/[^\s]{25,}/g, '[Link]')
      // Clean up repeated [Link] entries
      .replace(/(\[Link\]\s*){2,}/g, '[Link] ')
      // Remove lines that are just [Link]
      .replace(/^\s*\[Link\]\s*$/gm, '')
      // Clean up bracket artifacts: "(\n\n)" becomes "\n\n"
      .replace(/\(\s*\n\s*\n\s*\)/g, '\n\n')
      // Remove lines with just whitespace or invisible characters
      .replace(/^[\s‌\u200B\u200C\u200D\uFEFF]+$/gm, '')
      // Clean up cases where we have newline + spaces + newline
      .replace(/\n\s+\n/g, '\n\n')
      // More aggressive cleanup: replace 3+ newlines with just 2
      .replace(/\n{3,}/g, '\n\n')
      // Clean up double newlines that have spaces between them
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Clean up any remaining excessive spaces
      .replace(/[ \t]+/g, ' ')
      .trim();

    return cleanedText;
  } catch (error) {
    console.error('Error cleaning content:', error);
    // Fallback to simple cleanup including URL replacement
    return content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/[a-zA-Z,\s]+\{[^}]*\}/g, '') // Remove CSS
      .replace(/https?:\/\/[^\s]{25,}/g, '[Link]') // Replace long URLs
      .replace(/(\[Link\]\s*){2,}/g, '[Link] ') // Clean up repeated links
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

/**
 * Extract email metadata from headers
 */
function extractMetadata(emailObj: any) {
  const headers = emailObj.payload?.headers || [];
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
  const sender = headers.find((h: any) => h.name === 'From')?.value || '';
  const to = headers.find((h: any) => h.name === 'To')?.value || '';
  const cc = headers.find((h: any) => h.name === 'Cc')?.value || '';
  const replyTo = headers.find((h: any) => h.name === 'Reply-To')?.value || '';
  
  // Extract sender domain
  const senderEmailMatch = sender.match(/<([^>]+)>/) || sender.match(/([^\s]+@[^\s]+)/);
  const senderEmail = senderEmailMatch ? senderEmailMatch[1] || senderEmailMatch[0] : sender;
  const senderDomain = senderEmail.includes('@') ? senderEmail.split('@')[1] : 'unknown';

  return {
    subject,
    sender,
    senderDomain,
    to,
    cc,
    replyTo,
    threadId: emailObj.threadId,
    emailType: emailObj.emailType || 'inbox'
  };
}

/**
 * Convert Gmail email object to clean plain text
 * This is the main function that should be used throughout the application
 */
export function emailToPlaintext(emailObj: any): string {
  const metadata = extractMetadata(emailObj);
  const date = new Date(parseInt(emailObj.internalDate || '0')).toISOString();
  
  // Extract the email body content
  let bodyContent = extractBodyFromPayload(emailObj.payload);
  
  // If body extraction failed, try to use snippet
  if (!bodyContent && emailObj.snippet) {
    bodyContent = emailObj.snippet;
  }
  
  // Clean the content regardless of format
  if (bodyContent) {
    bodyContent = cleanContent(bodyContent);
  }
  
  // Final fallback
  if (!bodyContent) {
    bodyContent = 'No content available';
  }
  
  return `
Subject: ${metadata.subject}
From: ${metadata.sender}
To: ${metadata.to}
${metadata.cc ? `Cc: ${metadata.cc}` : ''}
Date: ${date}
Labels: ${emailObj.labelIds?.join(', ') || 'none'}

Email Body:
${bodyContent}
`.trim();
}

/**
 * Extract just the body content as plain text (without headers)
 * Useful when you only need the email content itself
 */
export function extractEmailBodyAsPlaintext(emailObj: any): string {
  // Extract the email body content
  let bodyContent = extractBodyFromPayload(emailObj.payload);
  
  // If body extraction failed, try to use snippet
  if (!bodyContent && emailObj.snippet) {
    bodyContent = emailObj.snippet;
  }
  
  // Clean the content regardless of format
  if (bodyContent) {
    bodyContent = cleanContent(bodyContent);
  }
  
  return bodyContent || 'No content available';
}

/**
 * Re-export metadata extraction for backward compatibility
 */
export function extractEmailMetadata(emailObj: any) {
  return extractMetadata(emailObj);
} 