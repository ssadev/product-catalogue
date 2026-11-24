import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('applies defaults so the app runs with no .env', () => {
    expect(loadConfig({})).toEqual({
      port: 3001,
      fakeStoreBaseUrl: 'https://fakestoreapi.com',
      catalogCacheTtlSeconds: 300,
      featuredConfigPath: 'config/featured.json',
      productSource: 'fakestore',
      smtp: { host: 'localhost', port: 1025, secure: false, user: undefined, pass: undefined },
      mailFrom: 'catalogue@example.com',
      salesInboxEmail: 'sales@example.com',
    });
  });

  it('parses provided values', () => {
    const config = loadConfig({ PORT: '4000', SMTP_SECURE: 'true', PRODUCT_SOURCE: 'fixture' });
    expect(config.port).toBe(4000);
    expect(config.smtp.secure).toBe(true);
    expect(config.productSource).toBe('fixture');
  });

  it('rejects an invalid sales inbox address, naming the variable', () => {
    expect(() => loadConfig({ SALES_INBOX_EMAIL: 'nope' })).toThrow(/SALES_INBOX_EMAIL/);
  });

  it('rejects an unknown product source, naming the variable', () => {
    expect(() => loadConfig({ PRODUCT_SOURCE: 'csv' })).toThrow(/PRODUCT_SOURCE/);
  });
});
