import { useEffect, type ReactNode } from 'react';
import { startAuth, useAuth } from '../lib/auth';
import SignIn from '../pages/SignIn';

// Signed out, the sign-in screen takes the place of the page at the same URL, so
// signing in shows the page that was asked for (R37, R39).
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    void startAuth();
  }, []);

  if (auth.status === 'loading') return null;
  if (auth.status === 'unavailable')
    return (
      <main className="sign-in">
        <p className="form-error" role="alert">
          Cannot reach the Accountable server. Check that it is running.
        </p>
      </main>
    );
  if (auth.status === 'signed-out')
    return <SignIn testSignInOn={auth.config.test_sign_in} />;
  return children;
}
