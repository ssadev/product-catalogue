import type { Enquiry } from '../domain/enquiry.js';
import { NotificationError } from '../errors.js';
import type { EnquiryNotifier } from '../ports.js';
import type { CatalogService } from './catalogService.js';

export class EnquiryService {
  constructor(
    private readonly catalog: CatalogService,
    private readonly notifier: EnquiryNotifier,
  ) {}

  /** Throws NotFoundError for an unknown product, NotificationError if sales could not be notified. */
  async submit(enquiry: Enquiry): Promise<void> {
    const product = await this.catalog.getProduct(enquiry.productId);
    try {
      await this.notifier.notify(enquiry, product);
    } catch (error) {
      throw new NotificationError(undefined, { cause: error });
    }
  }
}
