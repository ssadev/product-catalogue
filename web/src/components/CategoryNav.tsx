import { NavLink } from 'react-router';
import { api } from '../api/client';
import { useApi } from '../api/useApi';

export function CategoryNav() {
  const state = useApi(() => api.getCategories(), []);
  if (state.status !== 'success') return null; // nav is secondary; pages show their own errors

  return (
    <nav aria-label="Categories">
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {state.data.map((category) => (
          <li key={category.slug}>
            <NavLink
              to={`/category/${category.slug}`}
              className={({ isActive }) =>
                `capitalize hover:text-brand ${isActive ? 'font-semibold text-brand' : 'text-ink-muted'}`
              }
            >
              {category.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
