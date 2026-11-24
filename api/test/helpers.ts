import { fileURLToPath } from 'node:url';
import type { Express } from 'express';
import { FixtureCatalog } from '../src/adapters/fixtureCatalog.js';
import { createApp } from '../src/app.js';
import type { FeaturedConfig, FeaturedProducts, ProductCatalog } from '../src/ports.js';
import { CatalogService } from '../src/services/catalogService.js';

export const fixturePath = fileURLToPath(new URL('../fixtures/products.json', import.meta.url));

export function fixtureCatalog(): ProductCatalog {
  return new FixtureCatalog(fixturePath);
}

export function staticFeatured(config: FeaturedConfig): FeaturedProducts {
  return { getFeatured: async () => config };
}

export const defaultFeatured: FeaturedConfig = {
  home: ['3', '5', '12', '18', '11'],
  categories: { electronics: ['12', '9'] },
};

export interface TestAppOverrides {
  catalog?: ProductCatalog;
  featured?: FeaturedConfig;
}

export function buildTestApp(overrides: TestAppOverrides = {}): { app: Express } {
  const catalog = new CatalogService(
    overrides.catalog ?? fixtureCatalog(),
    staticFeatured(overrides.featured ?? defaultFeatured),
  );
  return { app: createApp({ catalog }) };
}
