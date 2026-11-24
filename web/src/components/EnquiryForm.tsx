import { type FormEvent, useId, useRef, useState } from 'react';
import { ApiError, api } from '../api/client';
import type { EnquiryInput } from '../api/types';

type Field = 'name' | 'email' | 'phone' | 'message';
type Values = Record<Field, string>;
type FieldErrors = Partial<Record<Field, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Quick client-side checks for fast feedback; the API remains the authority on validation. */
function validate(values: Values): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = 'Name is required';
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address';
  return errors;
}

function toInput(productId: string, values: Values): EnquiryInput {
  const optional = (value: string) => value.trim() || undefined;
  const input: EnquiryInput = { productId, name: values.name.trim(), email: values.email.trim() };
  const phone = optional(values.phone);
  const message = optional(values.message);
  if (phone) input.phone = phone;
  if (message) input.message = message;
  return input;
}

function serverFieldErrors(error: unknown): FieldErrors | undefined {
  if (!(error instanceof ApiError) || error.status !== 400 || !error.details) return undefined;
  return Object.fromEntries(error.details.map((d) => [d.path, d.message]));
}

export function EnquiryForm({ productId, productTitle }: { productId: string; productTitle: string }) {
  const [values, setValues] = useState<Values>({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const sending = useRef(false);
  const id = useId();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (sending.current) return;

    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    sending.current = true;
    setStatus('sending');
    try {
      await api.submitEnquiry(toInput(productId, values));
      setStatus('sent');
    } catch (error) {
      const fromServer = serverFieldErrors(error);
      if (fromServer) setErrors(fromServer);
      setStatus(fromServer ? 'idle' : 'failed');
    } finally {
      sending.current = false;
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className="rounded-card border border-success/30 bg-success/5 p-6">
        <h2 className="text-xl font-semibold text-success">Thank you</h2>
        <p className="mt-2">
          We've received your enquiry about {productTitle}. Our sales team will be in touch soon.
        </p>
      </div>
    );
  }

  const field = (name: Field, label: string, props: { type?: string; required?: boolean; multiline?: boolean } = {}) => {
    const inputId = `${id}-${name}`;
    const errorId = `${inputId}-error`;
    const common = {
      id: inputId,
      name,
      value: values[name],
      onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [name]: e.target.value })),
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': errors[name] ? errorId : undefined,
      className: 'w-full rounded-card border border-line bg-surface px-3 py-2 outline-none focus:border-brand',
    };
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
          {props.required ? ' *' : ' (optional)'}
        </label>
        {props.multiline ? (
          <textarea {...common} rows={4} maxLength={1000} />
        ) : (
          <input {...common} type={props.type ?? 'text'} maxLength={name === 'phone' ? 30 : 254} />
        )}
        {errors[name] && (
          <p id={errorId} className="text-sm text-danger">
            {errors[name]}
          </p>
        )}
      </div>
    );
  };

  return (
    <form aria-label="Enquiry" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
      {field('name', 'Name', { required: true })}
      {field('email', 'Email', { type: 'email', required: true })}
      {field('phone', 'Phone', { type: 'tel' })}
      {field('message', 'Message', { multiline: true })}
      {status === 'failed' && (
        <p role="alert" className="text-danger">
          Sorry, we couldn't send your enquiry. Please try again.
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={status === 'sending'}
          className="rounded-card bg-brand px-6 py-3 font-medium text-brand-ink hover:bg-brand-strong disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending…' : 'Send enquiry'}
        </button>
      </div>
    </form>
  );
}
