import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

export function SearchBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const currentQuery = pathname === '/search' ? (params.get('q') ?? '') : '';
  const [term, setTerm] = useState(currentQuery);

  // Keep the box in sync when navigating between result pages (or away from them).
  useEffect(() => setTerm(currentQuery), [currentQuery]);

  const trimmed = term.trim();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (trimmed) navigate(`/search?${new URLSearchParams({ q: trimmed })}`);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
      <label htmlFor="search" className="sr-only">
        Search products
      </label>
      <input
        id="search"
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search products"
        maxLength={200}
        className="min-w-0 flex-1 rounded-card border border-line bg-surface px-3 py-2 outline-none focus:border-brand"
      />
      <button
        type="submit"
        disabled={!trimmed}
        className="rounded-card bg-brand px-4 py-2 font-medium text-brand-ink hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        Search
      </button>
    </form>
  );
}
