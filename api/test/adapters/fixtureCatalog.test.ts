import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mapFakeStoreProducts } from '../../src/adapters/fakeStoreCatalog.js';
import { FixtureCatalog } from '../../src/adapters/fixtureCatalog.js';

const fixturePath = fileURLToPath(new URL('../../fixtures/products.json', import.meta.url));

describe('FixtureCatalog', () => {
  it('serves the bundled snapshot through the same mapping as the live adapter', async () => {
    const expected = mapFakeStoreProducts(JSON.parse(readFileSync(fixturePath, 'utf8')));
    await expect(new FixtureCatalog(fixturePath).getCatalogue()).resolves.toEqual(expected);
  });
});
