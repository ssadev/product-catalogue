import type { Category, Product } from '../api/types';

export const categories: Category[] = [
  { slug: 'mens-clothing', name: "men's clothing" },
  { slug: 'electronics', name: 'electronics' },
];

const product = (id: string, title: string, category: string, price: number): Product => ({
  id,
  title,
  description: `${title} description`,
  price,
  category,
  imageUrl: `https://img.test/${id}.jpg`,
  rating: { average: 4.5, count: 100 },
});

export const products: Product[] = [
  product('3', 'Mens Cotton Jacket', 'mens-clothing', 55.99),
  product('2', 'Mens Casual T-Shirt', 'mens-clothing', 22.3),
  product('12', 'WD 4TB Gaming Drive', 'electronics', 114),
  product('9', 'WD 2TB Portable Drive', 'electronics', 64),
  product('10', 'SanDisk SSD 1TB', 'electronics', 109),
];
