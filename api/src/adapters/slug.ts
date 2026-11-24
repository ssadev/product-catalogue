/** Turns a provider category name into a URL-safe slug we own: "men's clothing" -> "mens-clothing". */
export function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
