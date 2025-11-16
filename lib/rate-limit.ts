/**
 * Simple in-memory rate limiting for MVP
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

/**
 * Rate limit configuration
 */
const RATE_LIMITS = {
  linkGeneration: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute
  },
  voting: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 votes per minute
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  },
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
  identifier: string,
  type: keyof typeof RATE_LIMITS
): { allowed: boolean; remaining: number; resetTime: number } {
  const config = RATE_LIMITS[type]
  const now = Date.now()
  const key = `${type}:${identifier}`
  
  const record = store[key]
  
  // If no record or window expired, create new record
  if (!record || now > record.resetTime) {
    store[key] = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    }
  }
  
  // Increment count
  record.count += 1
  
  // Check if limit exceeded
  if (record.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    }
  }
  
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  }
}

/**
 * Clean up expired rate limit records (run periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
}

