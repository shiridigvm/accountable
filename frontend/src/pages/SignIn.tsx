import { useState, type FormEvent } from 'react';
import { signIn, testSignIn } from '../lib/auth';
import './SignIn.css';

type Props = { testSignInOn: boolean };

// The sign-in screen (R37, R38). There is no sign-up: people are added in Supabase.
export default function SignIn({ testSignInOn }: Props) {
  return (
    <main className="sign-in">
      <div className="sign-in-column">
        <div className="wordmark sign-in-wordmark">
          Account<span>able</span>
        </div>
        <PasswordForm />
        {testSignInOn && <TestForm />}
      </div>
    </main>
  );
}

function PasswordForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(await signIn(email.trim(), password));
    setBusy(false);
  }

  return (
    <form className="panel sign-in-panel" onSubmit={submit}>
      <h1>Sign in</h1>
      <div className="field">
        <label htmlFor="sign-in-email">Email</label>
        <input
          id="sign-in-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="sign-in-password">Password</label>
        <input
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button primary" disabled={busy}>
        Sign in
      </button>
    </form>
  );
}

// Only while ACCOUNTABLE_TEST_SIGN_IN=1 (R43), for the end-to-end tests and ui-check.
function TestForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(await testSignIn(email.trim()));
  }

  return (
    <form
      className="panel sign-in-panel"
      onSubmit={submit}
      aria-labelledby="test-sign-in-heading"
    >
      <h2 id="test-sign-in-heading">Test sign-in</h2>
      <div className="field">
        <label htmlFor="test-sign-in-email">Email</label>
        <input
          id="test-sign-in-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="button ghost">
        Sign in for testing
      </button>
    </form>
  );
}
