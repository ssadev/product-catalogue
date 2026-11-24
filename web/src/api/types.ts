/**
 * Mirror of the API contract (api/src/domain + response shapes).
 * The only place the web app knows response shapes; change together with the API.
 */
export interface Product {
  id: string;
  title: string;
  description: string;
  /** AUD, dollars */
  price: number;
  /** Category slug */
  category: string;
  imageUrl: string;
  rating: { average: number; count: number };
}

export interface Category {
  slug: string;
  name: string;
}

export interface CategoryProducts {
  category: Category;
  topRated: Product[];
  others: Product[];
}

export interface EnquiryInput {
  productId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: { path: string; message: string }[] };
}
