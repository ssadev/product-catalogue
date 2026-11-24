import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api/client';
import { categories, products } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';

beforeEach(() => {
  vi.spyOn(api, 'getCategories').mockResolvedValue(categories);
});

describe('HomePage', () => {
  it('shows the featured top rated products as tiles linking to their pages', async () => {
    vi.spyOn(api, 'getFeatured').mockResolvedValue(products);
    renderRoute('/');

    const section = await screen.findByRole('region', { name: 'Top rated' });
    const tiles = within(section).getAllByRole('link');
    expect(tiles).toHaveLength(5);
    expect(tiles[0]).toHaveAttribute('href', '/products/3');
    expect(tiles[0]).toHaveTextContent('Mens Cotton Jacket');
    expect(tiles[0]).toHaveTextContent('$55.99');
  });

  it('opens the product page when a tile is clicked', async () => {
    vi.spyOn(api, 'getFeatured').mockResolvedValue(products);
    vi.spyOn(api, 'getProduct').mockResolvedValue(products[0]!);
    renderRoute('/');

    await userEvent.click(await screen.findByRole('link', { name: /Mens Cotton Jacket/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Mens Cotton Jacket' })).toBeInTheDocument();
    expect(api.getProduct).toHaveBeenCalledWith('3');
  });

  it('shows an error when products cannot be loaded', async () => {
    vi.spyOn(api, 'getFeatured').mockRejectedValue(new ApiError(502, 'UPSTREAM_UNAVAILABLE', 'down'));
    renderRoute('/');
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });
});
