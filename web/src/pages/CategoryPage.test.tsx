import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api/client';
import { categories, products } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';

const electronics = categories[1]!;
const [, , drive4tb, drive2tb, ssd] = products;

beforeEach(() => {
  vi.spyOn(api, 'getCategories').mockResolvedValue(categories);
});

describe('CategoryPage', () => {
  it('shows top rated products and the other products in the category', async () => {
    vi.spyOn(api, 'getCategoryProducts').mockResolvedValue({
      category: electronics,
      topRated: [drive4tb!, drive2tb!],
      others: [ssd!],
    });
    renderRoute('/category/electronics');

    const top = await screen.findByRole('region', { name: 'Top rated in electronics' });
    expect(within(top).getAllByRole('link')).toHaveLength(2);
    const more = screen.getByRole('region', { name: 'More in electronics' });
    expect(within(more).getByRole('link')).toHaveTextContent('SanDisk SSD 1TB');
    expect(api.getCategoryProducts).toHaveBeenCalledWith('electronics');
  });

  it('hides the "More in" section when there are no other products', async () => {
    vi.spyOn(api, 'getCategoryProducts').mockResolvedValue({ category: electronics, topRated: [drive4tb!], others: [] });
    renderRoute('/category/electronics');
    await screen.findByRole('region', { name: 'Top rated in electronics' });
    expect(screen.queryByRole('region', { name: 'More in electronics' })).not.toBeInTheDocument();
  });

  it('shows "Category not found" for an unknown category', async () => {
    vi.spyOn(api, 'getCategoryProducts').mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Category not found'));
    renderRoute('/category/nope');
    expect(await screen.findByText('Category not found')).toBeInTheDocument();
  });
});
