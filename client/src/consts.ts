/**
 * Centralized constants that drive client behavior
 * Modify these values to adjust application performance and limits
 */

// === EMAIL PROCESSING ===
export const EMAIL_BATCH_SIZE = 200;              // Emails per batch for insights processing
export const INSIGHTS_BATCH_SIZE = 10;            // Insights per batch for parallel processing

// === API DEFAULTS ===
export const DEFAULT_SESSION_ID = 'default';      // Default session identifier for API calls 