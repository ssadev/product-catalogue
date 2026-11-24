import type { ApiErrorBody, Category, CategoryProducts, EnquiryInput, Product } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: { path: string; message: string }[];

  constructor(status: number, code: string, message: string, details?: { path: string; message: string }[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'object';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server');
  }

  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(response.status, body.error.code, body.error.message, body.error.details);
    }
    throw new ApiError(response.status, 'UNKNOWN', `Request failed (${response.status})`);
  }
  return body as T;
}

const segment = encodeURIComponent;

/** Every call the web app makes. Components never build URLs themselves. */
export const api = {
  getCategories: () => request<Category[]>('/api/categories'),
  getFeatured: () => request<Product[]>('/api/products/featured'),
  getCategoryProducts: (slug: string) => request<CategoryProducts>(`/api/categories/${segment(slug)}/products`),
  searchProducts: (q: string) => request<Product[]>(`/api/products?${new URLSearchParams({ q })}`),
  getProduct: (id: string) => request<Product>(`/api/products/${segment(id)}`),
  submitEnquiry: async (input: EnquiryInput): Promise<void> => {
    await request<unknown>('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
};
