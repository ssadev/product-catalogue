import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../src/errors.js';
import type { FeaturedConfig } from '../../src/ports.js';
import { CatalogService } from '../../src/services/catalogService.js';
import { defaultFeatured, fixtureCatalog, staticFeatured } from '../helpers.js';

const service = (featured: FeaturedConfig = defaultFeatured) =>
  new CatalogService(fixtureCatalog(), staticFeatured(featured));
const ids = (products: { id: string }[]) => products.map((p) => p.id);

describe('CatalogService.getFeatured', () => {
  it('returns the curated home products in configured order', async () => {
    expect(ids(await service().getFeatured())).toEqual(['3', '5', '12', '18', '11']);
  });

  it('skips curated ids that no longer exist, with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await service({ home: ['3', '999', '5'], categories: {} }).getFeatured();
    expect(ids(result)).toEqual(['3', '5']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('999'));
  });

  it('caps the home page at 5 products', async () => {
    const result = await service({ home: ['1', '2', '3', '4', '5', '6', '7'], categories: {} }).getFeatured();
    expect(ids(result)).toEqual(['1', '2', '3', '4', '5']);
  });
});

describe('CatalogService.getCategoryProducts', () => {
  it('uses curated top rated ids for the category, the rest go to others', async () => {
    const result = await service().getCategoryProducts('electronics');
    expect(result.category).toEqual({ slug: 'electronics', name: 'electronics' });
    expect(ids(result.topRated)).toEqual(['12', '9']);
    expect(ids(result.others)).toEqual(['10', '11', '13', '14']);
  });

  it('falls back to the top 3 by rating when the category is not curated', async () => {
    const result = await service().getCategoryProducts('mens-clothing');
    expect(ids(result.topRated)).toEqual(['3', '2', '1']);
    expect(ids(result.others)).toEqual(['4']);
  });

  it('ignores curated ids from another category and breaks rating ties by review count', async () => {
    const result = await service({ home: [], categories: { electronics: ['3'] } }).getCategoryProducts('electronics');
    expect(ids(result.topRated)).toEqual(['12', '11', '9']);
    expect(ids(result.others)).toEqual(['10', '13', '14']);
  });

  it('throws NotFoundError for an unknown category', async () => {
    await expect(service().getCategoryProducts('nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CatalogService.search', () => {
  it('matches title or description, case-insensitively', async () => {
    expect(ids(await service().search('jacket'))).toEqual(['3', '15', '16', '17']);
    expect(ids(await service().search('JACKET'))).toEqual(['3', '15', '16', '17']);
  });

  it('matches the category display name', async () => {
    expect(ids(await service().search('jewelery'))).toEqual(['5', '6', '7', '8']);
  });

  it('treats regex metacharacters literally', async () => {
    await expect(service().search('(')).resolves.toBeInstanceOf(Array);
    expect(await service().search('.*')).toEqual([]);
  });

  it('returns an empty list when nothing matches', async () => {
    expect(await service().search('zzzz-no-match')).toEqual([]);
  });
});

describe('CatalogService.getProduct', () => {
  it('returns the product by id', async () => {
    expect((await service().getProduct('1')).title).toMatch(/^Fjallraven/);
  });

  it('throws NotFoundError for an unknown id', async () => {
    await expect(service().getProduct('999')).rejects.toBeInstanceOf(NotFoundError);
  });
});
