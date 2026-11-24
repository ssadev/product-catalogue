import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JsonFeaturedProducts } from '../../src/adapters/jsonFeaturedProducts.js';

function writeConfig(content: string): string {
  const file = join(mkdtempSync(join(tmpdir(), 'featured-')), 'featured.json');
  writeFileSync(file, content);
  return file;
}

describe('JsonFeaturedProducts', () => {
  it('reads curated ids from the file', async () => {
    const file = writeConfig('{ "home": ["1", "2"], "categories": { "electronics": ["9"] } }');
    await expect(new JsonFeaturedProducts(file).getFeatured()).resolves.toEqual({
      home: ['1', '2'],
      categories: { electronics: ['9'] },
    });
  });

  it('defaults categories to empty when omitted', async () => {
    const file = writeConfig('{ "home": ["1"] }');
    await expect(new JsonFeaturedProducts(file).getFeatured()).resolves.toEqual({ home: ['1'], categories: {} });
  });

  it('rejects an invalid file with an error naming it', async () => {
    const file = writeConfig('{ "home": "x" }');
    await expect(new JsonFeaturedProducts(file).getFeatured()).rejects.toThrow(file);
  });
});
