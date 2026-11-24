import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { buildTestApp } from './helpers.js';
import { errorHandler } from '../src/http/errorHandler.js';

describe('app skeleton', () => {
  const { app } = buildTestApp();

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('unknown route returns 404 in the standard error shape', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('malformed JSON body returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('malformed percent-encoding in the path is a 400, not a server error', async () => {
    const res = await request(app).get('/api/products/%E0%A4%A');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('unexpected errors return 500 without leaking internals', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = express();
    broken.get('/boom', () => {
      throw new Error('database password is hunter2');
    });
    broken.use(errorHandler);

    const res = await request(broken).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
  });
});
