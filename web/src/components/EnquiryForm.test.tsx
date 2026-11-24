import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api/client';
import { EnquiryForm } from './EnquiryForm';

function renderForm() {
  render(<EnquiryForm productId="3" productTitle="Mens Cotton Jacket" />);
  return {
    name: screen.getByLabelText(/^Name/),
    email: screen.getByLabelText(/^Email/),
    phone: screen.getByLabelText(/^Phone/),
    message: screen.getByLabelText(/^Message/),
    submit: screen.getByRole('button', { name: 'Send enquiry' }),
  };
}

describe('EnquiryForm', () => {
  it('submits contact details and thanks the customer', async () => {
    const submit = vi.spyOn(api, 'submitEnquiry').mockResolvedValue();
    const form = renderForm();

    await userEvent.type(form.name, 'Ada');
    await userEvent.type(form.email, 'ada@example.com');
    await userEvent.click(form.submit);

    expect(submit).toHaveBeenCalledWith({ productId: '3', name: 'Ada', email: 'ada@example.com' });
    expect(await screen.findByRole('heading', { name: 'Thank you' })).toBeInTheDocument();
    expect(screen.getByText(/received your enquiry about Mens Cotton Jacket/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send enquiry' })).not.toBeInTheDocument();
  });

  it('includes optional phone and message when given', async () => {
    const submit = vi.spyOn(api, 'submitEnquiry').mockResolvedValue();
    const form = renderForm();

    await userEvent.type(form.name, 'Ada');
    await userEvent.type(form.email, 'ada@example.com');
    await userEvent.type(form.phone, '0400 000 000');
    await userEvent.type(form.message, 'Size M?');
    await userEvent.click(form.submit);

    expect(submit).toHaveBeenCalledWith({
      productId: '3',
      name: 'Ada',
      email: 'ada@example.com',
      phone: '0400 000 000',
      message: 'Size M?',
    });
  });

  it('validates required fields before sending', async () => {
    const submit = vi.spyOn(api, 'submitEnquiry');
    const form = renderForm();

    await userEvent.type(form.email, 'nope');
    await userEvent.click(form.submit);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(form.name).toHaveAttribute('aria-invalid', 'true');
    expect(submit).not.toHaveBeenCalled();
  });

  it('sends only once on double click and shows progress', async () => {
    let resolve!: () => void;
    const submit = vi.spyOn(api, 'submitEnquiry').mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const form = renderForm();

    await userEvent.type(form.name, 'Ada');
    await userEvent.type(form.email, 'ada@example.com');
    await userEvent.dblClick(form.submit);

    expect(submit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    resolve();
    expect(await screen.findByRole('heading', { name: 'Thank you' })).toBeInTheDocument();
  });

  it('keeps the input and explains when sending fails', async () => {
    vi.spyOn(api, 'submitEnquiry').mockRejectedValue(new ApiError(502, 'NOTIFICATION_FAILED', 'Could not send'));
    const form = renderForm();

    await userEvent.type(form.name, 'Ada');
    await userEvent.type(form.email, 'ada@example.com');
    await userEvent.click(form.submit);

    expect(await screen.findByRole('alert')).toHaveTextContent("Sorry, we couldn't send your enquiry. Please try again.");
    expect(screen.queryByRole('heading', { name: 'Thank you' })).not.toBeInTheDocument();
    expect(form.name).toHaveValue('Ada');
  });

  it('shows field errors returned by the server', async () => {
    vi.spyOn(api, 'submitEnquiry').mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', [{ path: 'phone', message: 'Invalid phone number' }]),
    );
    const form = renderForm();

    await userEvent.type(form.name, 'Ada');
    await userEvent.type(form.email, 'ada@example.com');
    await userEvent.type(form.phone, '12345');
    await userEvent.click(form.submit);

    expect(await screen.findByText('Invalid phone number')).toBeInTheDocument();
  });
});
