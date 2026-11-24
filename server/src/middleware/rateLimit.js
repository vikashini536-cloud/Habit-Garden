import rateLimit from 'express-rate-limit';

// Limits how often one IP address can try signup or login.
// This slows down password guessing. It counts every attempt, successful or not.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
});
