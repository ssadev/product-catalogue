import { describe, expect, it } from 'vitest';
import { toSlug } from '../../src/adapters/slug.js';

describe('toSlug', () => {
  it.each([
    ["men's clothing", 'mens-clothing'],
    ["women's clothing", 'womens-clothing'],
    ['jewelery', 'jewelery'],
    ['  TV & Audio ', 'tv-audio'],
  ])('%j -> %j', (input, expected) => {
    expect(toSlug(input)).toBe(expected);
  });
});
