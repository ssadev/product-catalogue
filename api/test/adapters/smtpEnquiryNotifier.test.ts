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

describe('createSmtpTransport', () => {
  it('gives up on an unresponsive mail server instead of hanging the request', async () => {
    const { createServer } = await import('node:net');
    const { createSmtpTransport } = await import('../../src/adapters/smtpEnquiryNotifier.js');
    // Accepts connections but never sends the SMTP greeting.
    const sockets: import('node:net').Socket[] = [];
    const server = createServer((socket) => sockets.push(socket));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as import('node:net').AddressInfo;

    const transport = createSmtpTransport({ host: '127.0.0.1', port, secure: false }, { timeoutMs: 200 });
    const started = Date.now();
    await expect(
      transport.sendMail({ from: 'a@example.com', to: 'b@example.com', subject: 's', text: 't' }),
    ).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(2000);

    sockets.forEach((s) => s.destroy());
    server.close();
  });
});
