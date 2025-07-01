import { extractEmailBody } from './extract-email-body';
import { cleanHtmlContent } from './clean-html-content';

/**
 * Extract readable content from email object
 * Combines email headers (subject, from, to, date) with body content
 */
export function extractEmailContent(emailObj: any): string {
  const headers = emailObj.payload?.headers || [];
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
  const from = headers.find((h: any) => h.name === 'From')?.value || '';
  const to = headers.find((h: any) => h.name === 'To')?.value || '';
  const cc = headers.find((h: any) => h.name === 'Cc')?.value || '';
  const date = new Date(parseInt(emailObj.internalDate)).toISOString();
  
  // Extract the full email body content
  let bodyContent = extractEmailBody(emailObj.payload);
  
  // If body extraction failed, try to use snippet but clean it first
  if (!bodyContent && emailObj.snippet) {
    const snippet = emailObj.snippet;
    // Check if snippet contains HTML entities or tags and clean it
    if (snippet.includes('&') || snippet.includes('<') || snippet.length > 200) {
      bodyContent = cleanHtmlContent(snippet);
    } else {
      bodyContent = snippet;
    }
  }
  
  // Final fallback
  if (!bodyContent) {
    bodyContent = 'No content available';
  }
  
  return `
Subject: ${subject}
From: ${from}
To: ${to}
${cc ? `Cc: ${cc}` : ''}
Date: ${date}
Labels: ${emailObj.labelIds?.join(', ') || 'none'}

Email Body:
${bodyContent}
`.trim();
} 