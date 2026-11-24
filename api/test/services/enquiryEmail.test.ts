import { describe, expect, it } from 'vitest';
import type { Product } from '../../src/domain/product.js';
import { formatEnquiryEmail } from '../../src/services/enquiryEmail.js';

const product: Product = {
  id: '3',
  title: 'Mens Cotton Jacket',
  description: 'Warm',
  price: 55.99,
  category: 'mens-clothing',
  imageUrl: 'https://img.test/3.jpg',
  rating: { average: 4.7, count: 500 },
};

describe('formatEnquiryEmail', () => {
  it('builds a subject and plain-text body with everything sales needs', () => {
    const { subject, text } = formatEnquiryEmail(
      { productId: '3', name: 'Ada Lovelace', email: 'ada@example.com', phone: '+61 400 000 000', message: 'Size M?' },
      product,
    );
    expect(subject).toBe('New enquiry: Mens Cotton Jacket');
    for (const expected of ['Ada Lovelace', 'ada@example.com', '+61 400 000 000', 'Size M?', '3', 'Mens Cotton Jacket', '$55.99']) {
      expect(text).toContain(expected);
    }
  });

  it('renders missing optional fields as "-"', () => {
    const { text } = formatEnquiryEmail({ productId: '3', name: 'Ada', email: 'ada@example.com' }, product);
    expect(text).toMatch(/Phone:\s+-/);
    expect(text).toMatch(/Message:\s+-/);
  });

  it('collapses line breaks in the product title so the subject is one line', () => {
    const { subject } = formatEnquiryEmail(
      { productId: '3', name: 'Ada', email: 'ada@example.com' },
      { ...product, title: 'Jacket\r\nBcc: evil@example.com' },
    );
    expect(subject).toBe('New enquiry: Jacket Bcc: evil@example.com');
  });
});
