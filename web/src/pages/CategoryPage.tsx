import { useParams } from 'react-router';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { ProductSection } from '../components/ProductGrid';
import { StatusMessage } from '../components/StatusMessage';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const state = useApi(() => api.getCategoryProducts(slug), [slug]);

  if (state.status === 'loading') return <StatusMessage kind="loading" />;
  if (state.status === 'error') {
    return state.error.status === 404 ? (
      <StatusMessage kind="empty" message="Category not found" />
    ) : (
      <StatusMessage kind="error" />
    );
  }

  const { category, topRated, others } = state.data;
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold capitalize">{category.name}</h1>
      <ProductSection title={`Top rated in ${category.name}`} products={topRated} />
      {others.length > 0 && <ProductSection title={`More in ${category.name}`} products={others} />}
    </>
  );
}
