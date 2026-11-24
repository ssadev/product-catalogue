import { describe, expect, it, vi } from 'vitest';
import { CachedCatalog } from '../../src/adapters/cachedCatalog.js';
import type { Catalogue } from '../../src/domain/product.js';
import type { ProductCatalog } from '../../src/ports.js';

const catalogue: Catalogue = { products: [], categories: [] };

function setup() {
  let now = 0;
  const inner = { getCatalogue: vi.fn<ProductCatalog['getCatalogue']>().mockResolvedValue(catalogue) };
  const cached = new CachedCatalog(inner, 1000, () => now);
  return { inner, cached, advance: (ms: number) => (now += ms) };
}

describe('CachedCatalog', () => {
  it('serves repeat calls within the TTL from cache', async () => {
    const { inner, cached, advance } = setup();
    await cached.getCatalogue();
    advance(999);
    await cached.getCatalogue();
    expect(inner.getCatalogue).toHaveBeenCalledTimes(1);
  });

  it('refetches once the TTL has passed', async () => {
    const { inner, cached, advance } = setup();
    await cached.getCatalogue();
    advance(1001);
    await cached.getCatalogue();
    expect(inner.getCatalogue).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures', async () => {
    const { inner, cached } = setup();
    inner.getCatalogue.mockRejectedValueOnce(new Error('down'));
    await expect(cached.getCatalogue()).rejects.toThrow('down');
    await expect(cached.getCatalogue()).resolves.toBe(catalogue);
    expect(inner.getCatalogue).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight request between concurrent callers', async () => {
    const { inner, cached } = setup();
    await Promise.all([cached.getCatalogue(), cached.getCatalogue(), cached.getCatalogue()]);
    expect(inner.getCatalogue).toHaveBeenCalledTimes(1);
  });
});
