import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { buildTestApp } from '../helpers.js';

const valid = { productId: '3', name: 'Ada', email: 'ada@example.com' };

describe('POST /api/enquiries', () => {
  it('accepts a valid enquiry and notifies sales', async () => {
    const { app, notifier } = buildTestApp();
    const res = await request(app).post('/api/enquiries').send(valid);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: 'received' });
    expect(notifier.calls).toHaveLength(1);
  });

  it('accepts optional phone and message', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post('/api/enquiries')
      .send({ ...valid, phone: '+61 (0)400 000-000', message: 'Do you have size M?\nThanks' });
    expect(res.status).toBe(202);
  });

  it('reports which field is invalid', async () => {
    const { app, notifier } = buildTestApp();
    const res = await request(app).post('/api/enquiries').send({ productId: '3', email: 'ada@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe('name');
    expect(notifier.calls).toHaveLength(0);
  });

  it.each([
    ['an invalid email', { ...valid, email: 'nope' }],
    ['unknown fields', { ...valid, admin: true }],
    ['control characters in the name', { ...valid, name: 'Bob\r\nBcc: x@y.z' }],
    ['letters in the phone', { ...valid, phone: 'call me' }],
    ['a blank name', { ...valid, name: '   ' }],
  ])('rejects %s', async (_label, body) => {
    const { app } = buildTestApp();
    const res = await request(app).post('/api/enquiries').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for an unknown product', async () => {
    const { app } = buildTestApp();
    const res = await request(app).post('/api/enquiries').send({ ...valid, productId: '999' });
    expect(res.status).toBe(404);
  });

  it('returns 502 NOTIFICATION_FAILED when email cannot be sent', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { app, notifier } = buildTestApp();
    notifier.fail = true;
    const res = await request(app).post('/api/enquiries').send(valid);
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('NOTIFICATION_FAILED');
  });

  it('rate limits repeated submissions', async () => {
    const { app } = buildTestApp({ enquiryRateLimit: { windowMs: 60_000, limit: 2 } });
    await request(app).post('/api/enquiries').send(valid);
    await request(app).post('/api/enquiries').send(valid);
    const res = await request(app).post('/api/enquiries').send(valid);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('rejects bodies over 10kb', async () => {
    const { app } = buildTestApp();
    const res = await request(app).post('/api/enquiries').send({ ...valid, message: 'x'.repeat(11 * 1024) });
    expect(res.status).toBe(413);
  });
});
