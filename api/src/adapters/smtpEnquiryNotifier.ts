import nodemailer, { type Transporter } from 'nodemailer';
import type { Config } from '../config.js';
import type { Enquiry } from '../domain/enquiry.js';
import type { Product } from '../domain/product.js';
import type { EnquiryNotifier } from '../ports.js';
import { formatEnquiryEmail } from '../services/enquiryEmail.js';

/**
 * Sends enquiries over SMTP. Works with Mailpit locally and with most providers (SES, SendGrid,
 * Postmark) via their SMTP endpoints, so a provider change is usually config only.
 */
export class SmtpEnquiryNotifier implements EnquiryNotifier {
  constructor(private readonly options: { transport: Pick<Transporter, 'sendMail'>; from: string; to: string }) {}

  async notify(enquiry: Enquiry, product: Product): Promise<void> {
    const { subject, text } = formatEnquiryEmail(enquiry, product);
    await this.options.transport.sendMail({
      from: this.options.from,
      to: this.options.to,
      replyTo: enquiry.email,
      subject,
      text,
    });
  }
}

/**
 * nodemailer's defaults wait minutes for a silent server; cap each phase so the customer gets an
 * answer (and can retry) well before the reverse proxy times out.
 */
export function createSmtpTransport(smtp: Config['smtp'], options: { timeoutMs?: number } = {}): Transporter {
  const timeoutMs = options.timeoutMs ?? 10_000;
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
  });
}
