/**
 * In-memory sliding-window rate limiter for AI requests per user.
 * Helps prevent accidental flooding and respects Gemini API free tier limits.
 */

// Max requests per window per user
const MAX_REQUESTS_PER_WINDOW = 15;
// Window duration: 60 seconds (1 minute)
const WINDOW_MS = 60 * 1000;

const userRequestMap = new Map();

// Periodic cleanup of stale user records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of userRequestMap.entries()) {
    const validTimestamps = timestamps.filter((t) => now - t < WINDOW_MS);
    if (validTimestamps.length === 0) {
      userRequestMap.delete(userId);
    } else {
      userRequestMap.set(userId, validTimestamps);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Check if the user is within rate limits.
 * @param {string} userId
 * @returns {{ allowed: boolean, retryAfterSeconds?: number }}
 */
const checkAiRateLimit = (userId) => {
  const now = Date.now();
  const timestamps = userRequestMap.get(userId) || [];

  // Filter timestamps within current window
  const activeTimestamps = timestamps.filter((t) => now - t < WINDOW_MS);

  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = activeTimestamps[0];
    const retryAfterMs = WINDOW_MS - (now - oldest);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return {
      allowed: false,
      retryAfterSeconds,
      message: 'AI usage limit reached. Please try again later.'
    };
  }

  activeTimestamps.push(now);
  userRequestMap.set(userId, activeTimestamps);

  return { allowed: true };
};

module.exports = {
  checkAiRateLimit
};
