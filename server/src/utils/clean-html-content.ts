import { convert } from 'html-to-text';

/**
 * Convert HTML content to clean, readable text using html-to-text library
 * Optimized for email content with proper formatting preservation
 */
export function cleanHtmlContent(htmlContent: string): string {
  try {
    // First check if this looks like actual base64 encoded data (not HTML)
    const isLikelyBase64 = /^[A-Za-z0-9+/=_-]+$/.test(htmlContent.replace(/\s/g, ''));
    const spaceRatio = (htmlContent.match(/\s/g) || []).length / htmlContent.length;
    const hasLongWordsWithoutSpaces = /\w{50,}/.test(htmlContent);
    
    // Only treat as garbage if it's actually base64-like content (no HTML tags)
    if (isLikelyBase64 && spaceRatio < 0.05 && hasLongWordsWithoutSpaces && htmlContent.length > 100 && !htmlContent.includes('<')) {
      return 'Content appears to be encoded or corrupted and cannot be displayed as readable text.';
    }

    // Pre-process to remove CSS blocks that aren't properly wrapped in style tags
    let processedContent = htmlContent;
    
    // Remove CSS blocks that start with @media, @font-face, etc.
    processedContent = processedContent.replace(/@(?:media|font-face|keyframes)[^}]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '');
    
    // Remove CSS selectors and rules (more aggressive pattern)
    processedContent = processedContent.replace(/(?:^|\s)[.#]?[a-zA-Z][a-zA-Z0-9_-]*\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/gm, '');
    
    // Remove remaining CSS-like content (property:value pairs)
    processedContent = processedContent.replace(/(?:^|\s)[a-zA-Z-]+\s*:\s*[^;{}]+;/gm, '');
    
    // Remove common CSS keywords and values that might still be lingering
    processedContent = processedContent.replace(/\b(?:important|inherit|none|auto|block|inline|flex|grid|absolute|relative|fixed|left|right|center|bold|italic|underline|solid|dotted|dashed)\s*[!;]/g, '');
    
    // Remove zero-width characters and excessive whitespace entities
    processedContent = processedContent.replace(/&#847;|&zwnj;|&#160;/g, ' ');

    // Use html-to-text to convert HTML to readable text
    const text = convert(processedContent, {
      wordwrap: 80,
      selectors: [
        // Remove tracking pixels and images
        { selector: 'img', format: 'skip' },
        // Remove style and script tags
        { selector: 'style', format: 'skip' },
        { selector: 'script', format: 'skip' },
        // Remove common email footer elements
        { selector: '.footer', format: 'skip' },
        { selector: '.unsubscribe', format: 'skip' },
        // Skip elements that commonly contain CSS
        { selector: 'head', format: 'skip' },
        { selector: 'meta', format: 'skip' },
        { selector: 'link', format: 'skip' },
        // Format links nicely
        { selector: 'a', options: { ignoreHref: true } },
        // Keep important structure
        { selector: 'h1,h2,h3,h4,h5,h6', options: { uppercase: false } },
        { selector: 'p', options: { leadingLineBreaks: 1, trailingLineBreaks: 1 } },
        { selector: 'br', format: 'lineBreak' }
      ]
    });

    // Clean up any remaining excessive whitespace and CSS remnants
    let cleanText = text
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 consecutive line breaks
      .replace(/[ \t]+/g, ' ') // Normalize spaces/tabs
      .replace(/^\s*[@.#][^a-zA-Z]*.*$/gm, '') // Remove lines that start with CSS-like patterns
      .replace(/^\s*[a-zA-Z-]+\s*:\s*[^;{}]+;?\s*$/gm, '') // Remove CSS property lines
      .replace(/^\s*\}\s*$/gm, '') // Remove closing braces
      .replace(/^\s*\{\s*$/gm, '') // Remove opening braces
      .trim();

    // If the result is very short or empty, it might have been over-cleaned
    if (cleanText.length < 50 && htmlContent.length > 1000) {
      // Try a more conservative approach
      const conservativeText = convert(htmlContent, {
        wordwrap: 80,
        selectors: [
          { selector: 'style', format: 'skip' },
          { selector: 'script', format: 'skip' },
          { selector: 'head', format: 'skip' }
        ]
      });
      
      if (conservativeText.trim().length > cleanText.length) {
        cleanText = conservativeText
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          .replace(/[ \t]+/g, ' ')
          .trim();
      }
    }

    return cleanText;

  } catch (error) {
    console.error('Error converting HTML to text:', error);
    // Fallback to simple tag removal if html-to-text fails
    return htmlContent
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }
} 