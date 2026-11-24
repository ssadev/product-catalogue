import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api/client';
import type { Category, Product } from '../api/types';
import { useApi } from '../api/useApi';
import { StatusMessage } from '../components/StatusMessage';
import { formatPrice } from '../lib/formatPrice';

export function ProductPage() {
  const { id = '' } = useParams();
  const state = useApi(
    () =>
      Promise.all([
        api.getProduct(id),
        // Only used for the category's display name; the page still works without it.
        api.getCategories().catch((): Category[] => []),
      ]),
    [id],
  );

  if (state.status === 'loading') return <StatusMessage kind="loading" />;
  if (state.status === 'error') {
    return state.error.status === 404 ? (
      <StatusMessage kind="empty" message="Product not found" />
    ) : (
      <StatusMessage kind="error" message="Something went wrong loading this product. Please try again." />
    );
  }

  const [product, categories] = state.data;
  const categoryName = categories.find((c) => c.slug === product.category)?.name ?? product.category;
  return <ProductDetails key={product.id} product={product} categoryName={categoryName} />;
}

function ProductDetails({ product, categoryName }: { product: Product; categoryName: string }) {
  const [enquiring, setEnquiring] = useState(false);

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <div className="flex items-center justify-center rounded-card border border-line bg-surface p-8">
        <img src={product.imageUrl} alt={product.title} className="max-h-96 object-contain" />
      </div>
      <div className="flex flex-col gap-4">
        <Link to={`/category/${product.category}`} className="text-sm capitalize text-ink-muted hover:text-brand">
          {categoryName}
        </Link>
        <h1 className="text-2xl font-bold">{product.title}</h1>
        <p className="text-2xl font-semibold">{formatPrice(product.price)}</p>
        <p className="text-sm text-ink-muted">
          ★ {product.rating.average.toFixed(1)} ({product.rating.count} reviews)
        </p>
        <p className="leading-relaxed">{product.description}</p>
        <div>
          <button
            type="button"
            aria-expanded={enquiring}
            onClick={() => setEnquiring((open) => !open)}
            className="rounded-card bg-brand px-6 py-3 font-medium text-brand-ink hover:bg-brand-strong"
          >
            Enquire
          </button>
        </div>
      </div>
    </article>
  );
}
