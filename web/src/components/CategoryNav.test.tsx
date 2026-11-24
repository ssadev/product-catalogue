import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { categories } from '../test/fixtures';
import { CategoryNav } from './CategoryNav';

describe('CategoryNav', () => {
  it('links each category to its page by slug', async () => {
    vi.spyOn(api, 'getCategories').mockResolvedValue(categories);
    render(
      <MemoryRouter>
        <CategoryNav />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('link', { name: "men's clothing" })).toHaveAttribute('href', '/category/mens-clothing');
  });
});
