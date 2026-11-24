import type { Catalogue } from '../domain/product.js';
import type { ProductCatalog } from '../ports.js';

/** TTL cache in front of any catalogue. In-memory, so per-instance; swap for Redis when scaling out. */
export class CachedCatalog implements ProductCatalog {
  private cached?: { value: Catalogue; expiresAt: number };
  private inFlight?: Promise<Catalogue>;

  constructor(
    private readonly inner: ProductCatalog,
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  async getCatalogue(): Promise<Catalogue> {
    if (this.cached && this.now() < this.cached.expiresAt) return this.cached.value;
    this.inFlight ??= this.inner
      .getCatalogue()
      .then((value) => {
        this.cached = { value, expiresAt: this.now() + this.ttlMs };
        return value;
      })
      .finally(() => {
        this.inFlight = undefined;
      });
    return this.inFlight;
  }
}
