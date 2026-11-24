import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { UpstreamError } from '../../src/errors.js';
import { buildTestApp } from '../helpers.js';

describe('product routes', () => {
  const { app } = buildTestApp();

  it('GET /api/categories lists categories with our slugs', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    expect(res.body).toContainEqual({ slug: 'mens-clothing', name: "men's clothing" });
  });

  it('GET /api/products/featured returns 5 products', async () => {
    const res = await request(app).get('/api/products/featured');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
  });

  it('GET /api/categories/:slug/products splits top rated and others', async () => {
    const res = await request(app).get('/api/categories/electronics/products');
    expect(res.status).toBe(200);
    expect(res.body.category.slug).toBe('electronics');
    expect(res.body.topRated).toHaveLength(2);
    expect(res.body.others).toHaveLength(4);
  });

  it('GET /api/categories/:slug/products returns 404 for an unknown category', async () => {
    const res = await request(app).get('/api/categories/nope/products');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/products?q= trims the term and returns matches', async () => {
    const res = await request(app).get('/api/products').query({ q: '  jacket ' });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it.each([
    ['blank', { q: ' ' }],
    ['missing', {}],
    ['too long', { q: 'x'.repeat(201) }],
  ])('GET /api/products rejects a %s search term', async (_label, query) => {
    const res = await request(app).get('/api/products').query(query);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/products/:id returns the product or 404', async () => {
    expect((await request(app).get('/api/products/1')).status).toBe(200);
    const missing = await request(app).get('/api/products/999');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 502 UPSTREAM_UNAVAILABLE when the data source is down', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { app: downApp } = buildTestApp({
      catalog: { getCatalogue: () => Promise.reject(new UpstreamError()) },
    });
    const res = await request(downApp).get('/api/products/featured');
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });
});
