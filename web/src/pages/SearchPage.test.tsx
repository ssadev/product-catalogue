import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { categories, products } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';

beforeEach(() => {
  vi.spyOn(api, 'getCategories').mockResolvedValue(categories);
});

describe('SearchPage', () => {
  it('shows only the products the API returns for the term', async () => {
    vi.spyOn(api, 'searchProducts').mockResolvedValue([products[0]!]);
    renderRoute('/search?q=jacket');

    const results = await screen.findByRole('region', { name: 'Results for "jacket"' });
    const tiles = within(results).getAllByRole('link');
    expect(tiles).toHaveLength(1);
    expect(tiles[0]).toHaveTextContent('Mens Cotton Jacket');
    expect(api.searchProducts).toHaveBeenCalledWith('jacket');
  });

  it('says when nothing matches', async () => {
    vi.spyOn(api, 'searchProducts').mockResolvedValue([]);
    renderRoute('/search?q=jacket');
    expect(await screen.findByText('No products match "jacket".')).toBeInTheDocument();
  });

  it('asks for a term instead of calling the API when the query is blank', async () => {
    const search = vi.spyOn(api, 'searchProducts');
    renderRoute('/search?q=%20');
    expect(await screen.findByText('Enter a search term to find products.')).toBeInTheDocument();
    expect(search).not.toHaveBeenCalled();
  });
});
