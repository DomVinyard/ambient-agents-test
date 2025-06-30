/**
 * Aggressive HTML cleaning to extract only meaningful text content
 * Removes styles, scripts, CSS, tracking code, and other email junk
 */
export function cleanHtmlContent(htmlContent: string): string {
  let cleaned = htmlContent;

  // Remove style tags and their content completely
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove script tags and their content
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove CSS media queries and style attributes (common in email HTML)
  cleaned = cleaned.replace(/@media[^{]*\{[^{}]*\{[^{}]*\}[^{}]*\}/gi, '');
  cleaned = cleaned.replace(/@media[^{]*\{[^}]*\}/gi, '');
  
  // Remove CSS rules that aren't in media queries
  cleaned = cleaned.replace(/\.[a-zA-Z0-9_-]+\s*\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/#[a-zA-Z0-9_-]+\s*\{[^}]*\}/gi, '');
  
  // Remove common email tracking and styling junk
  cleaned = cleaned.replace(/&#847;&zwnj;/g, ''); // Zero-width non-joiner spam
  cleaned = cleaned.replace(/&zwnj;/g, '');
  cleaned = cleaned.replace(/&#160;/g, ' '); // Non-breaking space
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  
  // Remove data attributes and complex styling attributes
  cleaned = cleaned.replace(/\s*data-[a-zA-Z0-9-]*="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s*style="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s*class="[^"]*"/gi, '');
  
  // Remove all HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Clean up common HTML entities
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&copy;/g, '©');
  cleaned = cleaned.replace(/&reg;/g, '®');
  cleaned = cleaned.replace(/&trade;/g, '™');
  
  // Remove excessive whitespace and newlines
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\n\s*\n/g, '\n');
  
  // Remove lines that are just punctuation or symbols
  cleaned = cleaned.replace(/^[^\w\s]*$/gm, '');
  
  // Clean up common email footer junk
  cleaned = cleaned.replace(/unsubscribe|privacy policy|terms of service|update preferences/gi, '');
  
  return cleaned.trim();
} 