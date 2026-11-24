import { describe, expect, it, vi } from 'vitest';
import { NotFoundError, NotificationError } from '../../src/errors.js';
import { CatalogService } from '../../src/services/catalogService.js';
import { EnquiryService } from '../../src/services/enquiryService.js';
import { defaultFeatured, fixtureCatalog, RecordingNotifier, staticFeatured } from '../helpers.js';

function setup() {
  const notifier = new RecordingNotifier();
  const service = new EnquiryService(new CatalogService(fixtureCatalog(), staticFeatured(defaultFeatured)), notifier);
  return { notifier, service };
}

const enquiry = { productId: '3', name: 'Ada', email: 'ada@example.com' };

describe('EnquiryService.submit', () => {
  it('notifies sales once with the enquiry and the product', async () => {
    const { notifier, service } = setup();
    await service.submit(enquiry);
    expect(notifier.calls).toHaveLength(1);
    expect(notifier.calls[0]![0]).toEqual(enquiry);
    expect(notifier.calls[0]![1].title).toBe('Mens Cotton Jacket');
  });

  it('rejects an unknown product without notifying', async () => {
    const { notifier, service } = setup();
    await expect(service.submit({ ...enquiry, productId: '999' })).rejects.toBeInstanceOf(NotFoundError);
    expect(notifier.calls).toHaveLength(0);
  });

  it('wraps notifier failures in NotificationError', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { notifier, service } = setup();
    notifier.fail = true;
    await expect(service.submit(enquiry)).rejects.toBeInstanceOf(NotificationError);
  });
});
