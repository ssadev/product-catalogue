import { useId } from 'react';
import type { Product } from '../api/types';
import { ProductTile } from './ProductTile';

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} />
        </li>
      ))}
    </ul>
  );
}

/** A titled, labelled block of product tiles (exposed to assistive tech as a region). */
export function ProductSection({ title, products }: { title: string; products: Product[] }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="mb-10">
      <h2 id={headingId} className="mb-4 text-xl font-semibold capitalize">
        {title}
      </h2>
      <ProductGrid products={products} />
    </section>
  );
}
