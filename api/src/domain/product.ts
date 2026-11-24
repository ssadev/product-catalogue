/** Our product model. Deliberately independent of any provider's response shape. */
export interface Product {
  id: string;
  title: string;
  description: string;
  /** Price in AUD (dollars). */
  price: number;
  /** Category slug, see {@link Category}. */
  category: string;
  imageUrl: string;
  rating: { average: number; count: number };
}

export interface Category {
  /** URL-safe identifier we own, e.g. `mens-clothing`. */
  slug: string;
  /** Display name, e.g. `men's clothing`. */
  name: string;
}

export interface Catalogue {
  products: Product[];
  categories: Category[];
}
