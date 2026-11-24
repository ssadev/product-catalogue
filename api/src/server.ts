import { resolve } from 'node:path';
import { CachedCatalog } from './adapters/cachedCatalog.js';
import { FakeStoreCatalog } from './adapters/fakeStoreCatalog.js';
import { FixtureCatalog } from './adapters/fixtureCatalog.js';
import { JsonFeaturedProducts } from './adapters/jsonFeaturedProducts.js';
import { createSmtpTransport, SmtpEnquiryNotifier } from './adapters/smtpEnquiryNotifier.js';
import { createApp } from './app.js';
import { type Config, loadConfig } from './config.js';
import type { ProductCatalog } from './ports.js';
import { CatalogService } from './services/catalogService.js';
import { EnquiryService } from './services/enquiryService.js';

/** Composition root: the only place that knows which adapters are in use. */
function productSource(config: Config): ProductCatalog {
  return config.productSource === 'fixture'
    ? new FixtureCatalog(resolve('fixtures/products.json'))
    : new FakeStoreCatalog({ baseUrl: config.fakeStoreBaseUrl });
}

let config: Config;
try {
  config = loadConfig(process.env);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const catalog = new CatalogService(
  new CachedCatalog(productSource(config), config.catalogCacheTtlSeconds * 1000),
  new JsonFeaturedProducts(resolve(config.featuredConfigPath)),
);
const notifier = new SmtpEnquiryNotifier({
  transport: createSmtpTransport(config.smtp),
  from: config.mailFrom,
  to: config.salesInboxEmail,
});
const app = createApp({ catalog, enquiries: new EnquiryService(catalog, notifier) });

const server = app.listen(config.port, () => {
  console.log(`API listening on :${config.port} (source=${config.productSource})`);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
