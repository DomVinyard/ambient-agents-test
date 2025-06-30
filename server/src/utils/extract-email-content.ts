import { extractEmailBody } from './extract-email-body';

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
  const bodyContent = extractEmailBody(emailObj.payload);
  
  return `
Subject: ${subject}
From: ${from}
To: ${to}
${cc ? `Cc: ${cc}` : ''}
Date: ${date}
Labels: ${emailObj.labelIds?.join(', ') || 'none'}

Email Body:
${bodyContent || emailObj.snippet || 'No content available'}
`.trim();
} 