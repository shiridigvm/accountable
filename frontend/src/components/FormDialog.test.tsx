import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FormDialog, type FieldSpec } from './FormDialog';

const fields: FieldSpec[] = [
  { name: 'name', label: 'Name', kind: 'text', required: true },
  { name: 'email', label: 'Email', kind: 'email' },
  { name: 'value', label: 'Value', kind: 'number', min: 0 },
];

function setup(onSave = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  render(
    <FormDialog
      title="Add thing"
      fields={fields}
      initial={{ name: '', email: '', value: '' }}
      submitLabel="Add"
      onSave={onSave}
      onClose={onClose}
    />,
  );
  return { onSave, onClose };
}

describe('FormDialog validation', () => {
  it('asks for a required field and does not save', async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByLabelText(/Name/), 'Ana');
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText(/Enter an email address/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects a negative value', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByLabelText(/Name/), 'Ana');
    fireEvent.change(screen.getByLabelText('Value'), {
      target: { value: '-5' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Value must be 0 or more.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves valid values and then closes', async () => {
    const { onSave, onClose } = setup();
    await userEvent.type(screen.getByLabelText(/Name/), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        name: 'Ana',
        email: '',
        value: '',
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a server error and keeps the dialog open', async () => {
    const { ApiError } = await import('../api/client');
    const { onClose } = setup(
      vi.fn().mockRejectedValue(new ApiError('Name is taken.', 422)),
    );
    await userEvent.type(screen.getByLabelText(/Name/), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Name is taken.',
    );
    expect(onClose).not.toHaveBeenCalledWith();
  });
});
