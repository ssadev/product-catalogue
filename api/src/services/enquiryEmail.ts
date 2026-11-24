import type { Enquiry } from '../domain/enquiry.js';
import type { Product } from '../domain/product.js';

const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

/** Plain-text only: customer input is never interpreted as HTML. */
export function formatEnquiryEmail(enquiry: Enquiry, product: Product): { subject: string; text: string } {
  return {
    subject: `New enquiry: ${oneLine(product.title)}`,
    text: [
      'A customer has enquired about a product.',
      '',
      `Product:  ${oneLine(product.title)} (id ${product.id})`,
      `Price:    ${aud.format(product.price)}`,
      '',
      `Name:     ${enquiry.name}`,
      `Email:    ${enquiry.email}`,
      `Phone:    ${enquiry.phone || '-'}`,
      `Message:  ${enquiry.message || '-'}`,
      '',
      'Reply to this email to respond to the customer directly.',
    ].join('\n'),
  };
}
