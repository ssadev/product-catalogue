import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  FAKESTORE_BASE_URL: z.url().default('https://fakestoreapi.com'),
  CATALOG_CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),
  FEATURED_CONFIG_PATH: z.string().min(1).default('config/featured.json'),
  PRODUCT_SOURCE: z.enum(['fakestore', 'fixture']).default('fakestore'),
  SMTP_HOST: z.string().min(1).default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.email().default('catalogue@example.com'),
  SALES_INBOX_EMAIL: z.email().default('sales@example.com'),
});

export interface Config {
  port: number;
  fakeStoreBaseUrl: string;
  catalogCacheTtlSeconds: number;
  featuredConfigPath: string;
  productSource: 'fakestore' | 'fixture';
  smtp: { host: string; port: number; secure: boolean; user?: string; pass?: string };
  mailFrom: string;
  salesInboxEmail: string;
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${problems}`);
  }
  const e = result.data;
  return {
    port: e.PORT,
    fakeStoreBaseUrl: e.FAKESTORE_BASE_URL.replace(/\/+$/, ''),
    catalogCacheTtlSeconds: e.CATALOG_CACHE_TTL_SECONDS,
    featuredConfigPath: e.FEATURED_CONFIG_PATH,
    productSource: e.PRODUCT_SOURCE,
    smtp: {
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE === 'true',
      user: e.SMTP_USER || undefined,
      pass: e.SMTP_PASS || undefined,
    },
    mailFrom: e.MAIL_FROM,
    salesInboxEmail: e.SALES_INBOX_EMAIL,
  };
}
