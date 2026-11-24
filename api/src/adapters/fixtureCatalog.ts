import { readFile } from 'node:fs/promises';
import type { Catalogue } from '../domain/product.js';
import type { ProductCatalog } from '../ports.js';
import { mapFakeStoreProducts } from './fakeStoreCatalog.js';

/** Serves a bundled Fake Store snapshot. Selected with PRODUCT_SOURCE=fixture for offline demos. */
export class FixtureCatalog implements ProductCatalog {
  constructor(private readonly filePath: string) {}

  async getCatalogue(): Promise<Catalogue> {
    return mapFakeStoreProducts(JSON.parse(await readFile(this.filePath, 'utf8')));
  }
}
