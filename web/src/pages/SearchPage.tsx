import { useSearchParams } from 'react-router';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { ProductSection } from '../components/ProductGrid';
import { StatusMessage } from '../components/StatusMessage';

export function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  if (!q) return <StatusMessage kind="empty" message="Enter a search term to find products." />;
  return <SearchResults q={q} />;
}

function SearchResults({ q }: { q: string }) {
  const state = useApi(() => api.searchProducts(q), [q]);

  if (state.status === 'loading') return <StatusMessage kind="loading" />;
  if (state.status === 'error') return <StatusMessage kind="error" />;
  if (state.data.length === 0) return <StatusMessage kind="empty" message={`No products match "${q}".`} />;
  return <ProductSection title={`Results for "${q}"`} products={state.data} />;
}
