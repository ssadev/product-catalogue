import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './client';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('URL-encodes the search term', async () => {
    const fetchMock = stubFetch(json([]));
    await api.searchProducts("men's shirt");
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/products?q=men%27s+shirt');
  });

  it('encodes path segments', async () => {
    const fetchMock = stubFetch(json({ category: {}, topRated: [], others: [] }));
    await api.getCategoryProducts('a/b');
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/categories/a%2Fb/products');
  });

  it('turns an API error body into ApiError with status and code', async () => {
    stubFetch(json({ error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404));
    const error = await api.getProduct('999').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND', message: 'Product not found' });
  });

  it('handles non-JSON error bodies (e.g. a proxy error page)', async () => {
    stubFetch(new Response('<html>Bad Gateway</html>', { status: 502 }));
    const error = await api.getFeatured().catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 502, code: 'UNKNOWN' });
  });

  it('turns network failures into ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await api.getCategories().catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('POSTs enquiries as JSON', async () => {
    const fetchMock = stubFetch(json({ status: 'received' }, 202));
    await api.submitEnquiry({ productId: '3', name: 'Ada', email: 'ada@example.com' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/enquiries');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(init?.body as string)).toEqual({ productId: '3', name: 'Ada', email: 'ada@example.com' });
  });
});
