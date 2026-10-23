// Simple in-memory rate limiter
const rateLimitStore = new Map()

const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // max requests per window
    message = "Too many requests, please try again later.",
  } = options

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress
    const now = Date.now()

    // Clean up old entries
    for (const [ip, data] of rateLimitStore.entries()) {
      if (now - data.resetTime > windowMs) {
        rateLimitStore.delete(ip)
      }
    }

    // Get or create entry for this IP
    let entry = rateLimitStore.get(key)
    if (!entry || now - entry.resetTime > windowMs) {
      entry = {
        count: 0,
        resetTime: now,
      }
      rateLimitStore.set(key, entry)
    }

    // Check if limit exceeded
    if (entry.count >= max) {
      return res.status(429).json({
        success: false,
        message: typeof message === "string" ? message : message.message || "Too many requests",
        retryAfter: Math.ceil((windowMs - (now - entry.resetTime)) / 1000),
      })
    }

    // Increment counter
    entry.count++
    rateLimitStore.set(key, entry)

    // Add headers
    res.set({
      "X-RateLimit-Limit": max,
      "X-RateLimit-Remaining": Math.max(0, max - entry.count),
      "X-RateLimit-Reset": new Date(entry.resetTime + windowMs).toISOString(),
    })

    next()
  }
}

module.exports = createRateLimiter
