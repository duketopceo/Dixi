import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later.'
    });
  }
});

// Stricter rate limiter for AI inference
export const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit each IP to 20 AI requests per 5 minutes
  message: 'AI inference rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`AI rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'AI inference rate limit exceeded',
      message: 'Please reduce the frequency of AI queries.'
    });
  }
});

// Rate limiter for gesture tracking start/stop
export const gestureLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit to 10 start/stop requests per minute
  message: 'Gesture control rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn(`Gesture control rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many gesture control requests',
      message: 'Please wait before toggling gesture tracking again.'
    });
  }
});
