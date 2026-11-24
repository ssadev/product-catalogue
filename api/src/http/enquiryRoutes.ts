import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { Enquiry } from '../domain/enquiry.js';
import type { EnquiryService } from '../services/enquiryService.js';
import { parseOrThrow } from './validation.js';

export const enquirySchema: z.ZodType<Enquiry> = z.strictObject({
  productId: z.string().trim().min(1).max(50),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100)
    .regex(/^[^\p{Cc}]*$/u, 'Name contains invalid characters'),
  email: z.email('Enter a valid email address').max(254),
  phone: z.string().trim().max(30).regex(/^[0-9 +()-]*$/, 'Invalid phone number').optional(),
  message: z.string().trim().max(1000).optional(),
});

export interface RateLimitOptions {
  windowMs: number;
  limit: number;
}

export function enquiryRoutes(enquiries: EnquiryService, limits: RateLimitOptions): Router {
  const router = Router();

  const limiter = rateLimit({
    windowMs: limits.windowMs,
    limit: limits.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many enquiries, please try again shortly' } });
    },
  });

  router.post('/enquiries', limiter, async (req, res) => {
    await enquiries.submit(parseOrThrow(enquirySchema, req.body));
    res.status(202).json({ status: 'received' });
  });

  return router;
}
