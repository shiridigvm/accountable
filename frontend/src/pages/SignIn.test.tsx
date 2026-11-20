import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignIn from './SignIn';

const signIn = vi.fn();
const testSignIn = vi.fn();

vi.mock('../lib/auth', () => ({
  signIn: (...args: unknown[]) => signIn(...args),
  testSignIn: (...args: unknown[]) => testSignIn(...args),
}));

beforeEach(() => {
  signIn.mockReset();
  testSignIn.mockReset();
});

describe('SignIn', () => {
  it('has an email, a password and a sign-in button, and no sign-up (R38)', () => {
    render(<SignIn testSignInOn={false} />);
    expect(
      screen.getByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'type',
      'password',
    );
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText(/sign up/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Test sign-in')).not.toBeInTheDocument();
  });

  it('sends the email and password and shows a refusal', async () => {
    signIn.mockResolvedValue('Email or password is wrong.');
    render(<SignIn testSignInOn={false} />);
    await userEvent.type(screen.getByLabelText('Email'), ' ana@example.com ');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(signIn).toHaveBeenCalledWith('ana@example.com', 'secret');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email or password is wrong.',
    );
  });

  it('shows the sign-in service message', async () => {
    signIn.mockResolvedValue(
      "Can't reach the sign-in service. Check your connection.",
    );
    render(<SignIn testSignInOn={false} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Can't reach the sign-in service.",
    );
  });

  it('offers test sign-in only when it is on (R43)', async () => {
    testSignIn.mockResolvedValue(null);
    render(<SignIn testSignInOn />);
    const form = screen.getByRole('form', { name: 'Test sign-in' });
    await userEvent.type(
      form.querySelector('input') as HTMLInputElement,
      'ana@example.com',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Sign in for testing' }),
    );
    expect(testSignIn).toHaveBeenCalledWith('ana@example.com');
    expect(signIn).not.toHaveBeenCalled();
  });
});
