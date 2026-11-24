import { describe, expect, it, vi } from 'vitest';
import { SmtpEnquiryNotifier } from '../../src/adapters/smtpEnquiryNotifier.js';
import type { Product } from '../../src/domain/product.js';

const product: Product = {
  id: '3',
  title: 'Mens Cotton Jacket',
  description: 'Warm',
  price: 55.99,
  category: 'mens-clothing',
  imageUrl: 'https://img.test/3.jpg',
  rating: { average: 4.7, count: 500 },
};

describe('SmtpEnquiryNotifier', () => {
  it('sends a plain-text email to the sales inbox with reply-to set to the customer', async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const notifier = new SmtpEnquiryNotifier({ transport: { sendMail }, from: 'shop@example.com', to: 'sales@example.com' });

    await notifier.notify({ productId: '3', name: 'Ada', email: 'ada@example.com' }, product);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0]![0];
    expect(message).toMatchObject({
      from: 'shop@example.com',
      to: 'sales@example.com',
      replyTo: 'ada@example.com',
      subject: 'New enquiry: Mens Cotton Jacket',
      text: expect.stringContaining('Ada'),
    });
    expect(message).not.toHaveProperty('html');
  });
});
