import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { ProductSection } from '../components/ProductGrid';
import { StatusMessage } from '../components/StatusMessage';

export function HomePage() {
  const state = useApi(() => api.getFeatured(), []);

  if (state.status === 'loading') return <StatusMessage kind="loading" />;
  if (state.status === 'error') return <StatusMessage kind="error" />;
  if (state.data.length === 0) return <StatusMessage kind="empty" message="No featured products yet." />;
  return <ProductSection title="Top rated" products={state.data} />;
}
