import type { Enquiry } from './domain/enquiry.js';
import type { Catalogue, Product } from './domain/product.js';

/** Where product data comes from (Fake Store today; a PIM/DB later). */
export interface ProductCatalog {
  getCatalogue(): Promise<Catalogue>;
}

/** Owner-curated "top rated" product ids, by home page and by category slug. */
export interface FeaturedConfig {
  home: string[];
  categories: Record<string, string[]>;
}

/** Where curation lives (JSON file today; a CMS/admin UI later). */
export interface FeaturedProducts {
  getFeatured(): Promise<FeaturedConfig>;
}

/** How the sales team hears about an enquiry (SMTP today; SES/CRM later). */
export interface EnquiryNotifier {
  notify(enquiry: Enquiry, product: Product): Promise<void>;
}
