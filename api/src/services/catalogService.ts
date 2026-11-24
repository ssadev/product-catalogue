import type { Category, Product } from '../domain/product.js';
import { NotFoundError } from '../errors.js';
import type { FeaturedProducts, ProductCatalog } from '../ports.js';

export const HOME_FEATURED_LIMIT = 5;
export const FALLBACK_TOP_RATED_COUNT = 3;

export interface CategoryProducts {
  category: Category;
  topRated: Product[];
  others: Product[];
}

const byRatingDesc = (a: Product, b: Product) =>
  b.rating.average - a.rating.average || b.rating.count - a.rating.count;

/** Catalogue use cases. Knows nothing about where products or curation come from. */
export class CatalogService {
  constructor(
    private readonly catalog: ProductCatalog,
    private readonly featured: FeaturedProducts,
  ) {}

  async listCategories(): Promise<Category[]> {
    return (await this.catalog.getCatalogue()).categories;
  }

  async getFeatured(): Promise<Product[]> {
    const [{ products }, { home }] = await Promise.all([this.catalog.getCatalogue(), this.featured.getFeatured()]);
    return this.resolveIds(home, products).slice(0, HOME_FEATURED_LIMIT);
  }

  async getCategoryProducts(slug: string): Promise<CategoryProducts> {
    const [{ products, categories }, featured] = await Promise.all([
      this.catalog.getCatalogue(),
      this.featured.getFeatured(),
    ]);
    const category = categories.find((c) => c.slug === slug);
    if (!category) throw new NotFoundError('Category not found');

    const inCategory = products.filter((p) => p.category === slug);
    const curated = this.resolveIds(featured.categories[slug] ?? [], inCategory);
    const topRated =
      curated.length > 0 ? curated : [...inCategory].sort(byRatingDesc).slice(0, FALLBACK_TOP_RATED_COUNT);
    const topRatedIds = new Set(topRated.map((p) => p.id));

    return { category, topRated, others: inCategory.filter((p) => !topRatedIds.has(p.id)) };
  }

  /** Case-insensitive literal substring match on title, description and category name. */
  async search(term: string): Promise<Product[]> {
    const { products, categories } = await this.catalog.getCatalogue();
    const needle = term.toLowerCase();
    const categoryName = new Map(categories.map((c) => [c.slug, c.name]));
    return products.filter((p) =>
      [p.title, p.description, categoryName.get(p.category) ?? ''].some((text) =>
        text.toLowerCase().includes(needle),
      ),
    );
  }

  async getProduct(id: string): Promise<Product> {
    const product = (await this.catalog.getCatalogue()).products.find((p) => p.id === id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  /** Curated ids -> products, in curated order; ids not found in `pool` are skipped and logged. */
  private resolveIds(ids: string[], pool: Product[]): Product[] {
    const byId = new Map(pool.map((p) => [p.id, p]));
    return ids.flatMap((id) => {
      const product = byId.get(id);
      if (!product) console.warn(`[catalog] Featured product id "${id}" not found; skipping`);
      return product ? [product] : [];
    });
  }
}
