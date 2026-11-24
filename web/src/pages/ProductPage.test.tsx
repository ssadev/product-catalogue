import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api/client';
import { categories, products } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';

beforeEach(() => {
  vi.spyOn(api, 'getCategories').mockResolvedValue(categories);
});

describe('ProductPage', () => {
  it('shows the product details with an Enquire button', async () => {
    vi.spyOn(api, 'getProduct').mockResolvedValue(products[0]!);
    renderRoute('/products/3');

    expect(await screen.findByRole('heading', { level: 1, name: 'Mens Cotton Jacket' })).toBeInTheDocument();
    expect(screen.getByText('$55.99')).toBeInTheDocument();
    expect(screen.getByText('Mens Cotton Jacket description')).toBeInTheDocument();
    expect(within(screen.getByRole('article')).getByRole('link', { name: "men's clothing" })).toHaveAttribute('href', '/category/mens-clothing');
    expect(screen.getByRole('img', { name: 'Mens Cotton Jacket' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enquire' })).toBeInTheDocument();
  });

  it('shows "Product not found" for an unknown product', async () => {
    vi.spyOn(api, 'getProduct').mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Product not found'));
    renderRoute('/products/999');
    expect(await screen.findByText('Product not found')).toBeInTheDocument();
  });
});
