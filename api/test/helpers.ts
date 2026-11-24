import { fileURLToPath } from 'node:url';
import type { Express } from 'express';
import { FixtureCatalog } from '../src/adapters/fixtureCatalog.js';
import { createApp, type AppDeps } from '../src/app.js';
import type { Enquiry } from '../src/domain/enquiry.js';
import type { Product } from '../src/domain/product.js';
import type { EnquiryNotifier, FeaturedConfig, FeaturedProducts, ProductCatalog } from '../src/ports.js';
import { CatalogService } from '../src/services/catalogService.js';
import { EnquiryService } from '../src/services/enquiryService.js';

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

/** In-memory notifier that records calls; set `fail` to simulate the email provider being down. */
export class RecordingNotifier implements EnquiryNotifier {
  calls: [Enquiry, Product][] = [];
  fail = false;

  async notify(enquiry: Enquiry, product: Product): Promise<void> {
    if (this.fail) throw new Error('SMTP connection refused');
    this.calls.push([enquiry, product]);
  }
}

export interface TestAppOverrides {
  catalog?: ProductCatalog;
  featured?: FeaturedConfig;
  enquiryRateLimit?: AppDeps['enquiryRateLimit'];
}

export function buildTestApp(overrides: TestAppOverrides = {}): { app: Express; notifier: RecordingNotifier } {
  const catalog = new CatalogService(
    overrides.catalog ?? fixtureCatalog(),
    staticFeatured(overrides.featured ?? defaultFeatured),
  );
  const notifier = new RecordingNotifier();
  const app = createApp({
    catalog,
    enquiries: new EnquiryService(catalog, notifier),
    enquiryRateLimit: overrides.enquiryRateLimit ?? { windowMs: 60_000, limit: 1000 },
  });
  return { app, notifier };
}
