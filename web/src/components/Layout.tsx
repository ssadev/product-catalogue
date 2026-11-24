import { Link, Outlet } from 'react-router';
import { CategoryNav } from './CategoryNav';
import { SearchBar } from './SearchBar';

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/" className="text-xl font-bold text-brand">
              Product Catalogue
            </Link>
            <SearchBar />
          </div>
          <CategoryNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
