import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { FakeStoreCatalog, mapFakeStoreProducts } from '../../src/adapters/fakeStoreCatalog.js';
import { UpstreamError } from '../../src/errors.js';

const raw: unknown = JSON.parse(readFileSync(new URL('../../fixtures/products.json', import.meta.url), 'utf8'));

describe('mapFakeStoreProducts', () => {
  it('maps Fake Store items to our product model', () => {
    const { products } = mapFakeStoreProducts(raw);
    expect(products).toHaveLength(20);
    expect(products.find((p) => p.id === '3')).toEqual({
      id: '3',
      title: 'Mens Cotton Jacket',
      description: expect.any(String),
      price: 55.99,
      category: 'mens-clothing',
      imageUrl: expect.stringMatching(/^https:\/\//),
      rating: { average: 4.7, count: 500 },
    });
  });

  it('derives categories with our slugs, in first-seen order', () => {
    expect(mapFakeStoreProducts(raw).categories).toEqual([
      { slug: 'mens-clothing', name: "men's clothing" },
      { slug: 'jewelery', name: 'jewelery' },
      { slug: 'electronics', name: 'electronics' },
      { slug: 'womens-clothing', name: "women's clothing" },
    ]);
  });

  it('rejects responses that do not match the expected shape', () => {
    expect(() => mapFakeStoreProducts([{ id: 1 }])).toThrow(UpstreamError);
  });
});

describe('FakeStoreCatalog', () => {
  const okResponse = () => new Response(JSON.stringify(raw), { status: 200 });

  it('fetches /products from the base url with an abort signal', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(okResponse());
    const catalog = new FakeStoreCatalog({ baseUrl: 'https://store.test', fetchFn });

    const result = await catalog.getCatalogue();

    expect(result.products).toHaveLength(20);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://store.test/products');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('turns a non-2xx response into UpstreamError', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('down', { status: 503 }));
    const catalog = new FakeStoreCatalog({ baseUrl: 'https://store.test', fetchFn });
    await expect(catalog.getCatalogue()).rejects.toBeInstanceOf(UpstreamError);
  });

  it('turns network failures and timeouts into UpstreamError', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    const catalog = new FakeStoreCatalog({ baseUrl: 'https://store.test', fetchFn });
    await expect(catalog.getCatalogue()).rejects.toBeInstanceOf(UpstreamError);
  });

  it('turns a non-JSON body into UpstreamError', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>', { status: 200 }));
    const catalog = new FakeStoreCatalog({ baseUrl: 'https://store.test', fetchFn });
    await expect(catalog.getCatalogue()).rejects.toBeInstanceOf(UpstreamError);
  });
});
