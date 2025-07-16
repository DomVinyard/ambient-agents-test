/**
 * Centralized constants that drive server behavior
 * Modify these values to adjust system performance and limits
 */

// === GMAIL API & EMAIL PROCESSING ===
export const GMAIL_FETCH_LIMIT_PER_TYPE = 10;     // Default emails to fetch per type (sent/received)
export const GMAIL_CONCURRENT_REQUESTS = 20;       // Process N emails simultaneously
export const GMAIL_BATCH_DELAY_MS = 250;          // Delay between email batches (rate limiting)
export const GMAIL_RETRY_DELAY_MS = 1000;         // Base delay for retries (exponential backoff)
export const GMAIL_MAX_RETRIES = 3;               // Maximum retry attempts for failed requests

// === EXPRESS SERVER LIMITS ===
export const EXPRESS_JSON_LIMIT = '50mb';         // Maximum JSON payload size

// === PROFILE GENERATION ===
export const PROFILE_COMPILATION_WORD_LIMIT = 250; // Max words in compiled profile 