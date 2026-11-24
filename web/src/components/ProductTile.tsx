import { Link } from 'react-router';
import type { Product } from '../api/types';
import { formatPrice } from '../lib/formatPrice';

export function ProductTile({ product }: { product: Product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex h-full flex-col rounded-card border border-line bg-surface p-4 transition hover:border-brand hover:shadow-md"
    >
      <div className="mb-4 aspect-square overflow-hidden bg-surface">
        <img src={product.imageUrl} alt={product.title} loading="lazy" className="h-full w-full object-contain" />
      </div>
      <h3 className="line-clamp-2 text-sm font-medium group-hover:text-brand">{product.title}</h3>
      <p className="mt-auto pt-2 font-semibold">{formatPrice(product.price)}</p>
    </Link>
  );
}
