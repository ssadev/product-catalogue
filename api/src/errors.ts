export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request', details?: ValidationIssue[]) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UpstreamError extends AppError {
  constructor(message = 'Product data is temporarily unavailable', options?: { cause?: unknown }) {
    super(502, 'UPSTREAM_UNAVAILABLE', message);
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

export class NotificationError extends AppError {
  constructor(message = 'Could not send your enquiry', options?: { cause?: unknown }) {
    super(502, 'NOTIFICATION_FAILED', message);
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}
