import { z } from 'zod';
import type { Catalogue, Category, Product } from '../domain/product.js';
import { UpstreamError } from '../errors.js';
import type { ProductCatalog } from '../ports.js';
import { toSlug } from './slug.js';

/** Shape of https://fakestoreapi.com/products — only this file knows it. */
const fakeStoreProductSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  price: z.number().nonnegative(),
  description: z.string(),
  category: z.string().min(1),
  image: z.string(),
  rating: z.object({ rate: z.number(), count: z.number().int().nonnegative() }),
});
const fakeStoreResponseSchema = z.array(fakeStoreProductSchema);

export function mapFakeStoreProducts(raw: unknown): Catalogue {
  const parsed = fakeStoreResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new UpstreamError('Product data source returned an unexpected response', { cause: parsed.error });
  }

  const categories = new Map<string, Category>();
  const products: Product[] = parsed.data.map((item) => {
    const slug = toSlug(item.category);
    if (!categories.has(slug)) categories.set(slug, { slug, name: item.category });
    return {
      id: String(item.id),
      title: item.title.trim(),
      description: item.description.trim(),
      price: item.price,
      category: slug,
      imageUrl: item.image,
      rating: { average: item.rating.rate, count: item.rating.count },
    };
  });

  return { products, categories: [...categories.values()] };
}

export interface FakeStoreCatalogOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export class FakeStoreCatalog implements ProductCatalog {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: FakeStoreCatalogOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async getCatalogue(): Promise<Catalogue> {
    let body: unknown;
    try {
      const response = await this.fetchFn(`${this.baseUrl}/products`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) {
        throw new Error(`Fake Store responded ${response.status}`);
      }
      body = await response.json();
    } catch (error) {
      throw new UpstreamError(undefined, { cause: error });
    }
    return mapFakeStoreProducts(body);
  }
}
