import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { FeaturedConfig, FeaturedProducts } from '../ports.js';

const featuredSchema = z.object({
  home: z.array(z.string().min(1)),
  categories: z.record(z.string(), z.array(z.string().min(1))).default({}),
});

/**
 * Owner-curated featured products from a JSON file. Read on every call (it is tiny), so the owner
 * can change featured products without a restart. Replace with a CMS/DB adapter later.
 */
export class JsonFeaturedProducts implements FeaturedProducts {
  constructor(private readonly filePath: string) {}

  async getFeatured(): Promise<FeaturedConfig> {
    const parsed = featuredSchema.safeParse(JSON.parse(await readFile(this.filePath, 'utf8')));
    if (!parsed.success) {
      throw new Error(`Invalid featured products config in ${this.filePath}: ${parsed.error.message}`);
    }
    return parsed.data;
  }
}
