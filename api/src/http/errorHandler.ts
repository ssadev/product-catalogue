import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, NotFoundError } from '../errors.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError('Route not found'));
};

/** Express body-parser errors carry a `type` field. */
function bodyParserErrorType(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'type' in err && typeof err.type === 'string') {
    return err.type;
  }
  return undefined;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    if (err.status >= 500) console.error(`[api] ${err.code}: ${err.message}`, err.cause ?? '');
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  switch (bodyParserErrorType(err)) {
    case 'entity.parse.failed':
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' } });
      return;
    case 'entity.too.large':
      res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } });
      return;
  }

  // Other client errors raised by Express itself, e.g. a path with malformed percent-encoding.
  const status = typeof err === 'object' && err !== null && 'status' in err ? err.status : undefined;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Malformed request' } });
    return;
  }

  console.error('[api] Unhandled error', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
};
