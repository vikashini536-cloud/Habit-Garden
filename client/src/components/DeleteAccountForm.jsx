import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client.js';
import { deleteAccount } from '../api/auth.js';
import { useAuth } from '../auth/AuthContext.jsx';
import PasswordField from './PasswordField.jsx';

// Deleting an account needs two steps and the password again.
// On success the server removes everything, and this browser is signed out.
// RequireAuth then sends the user to the login page.
// "Keep my account" is focused when the form opens, and Escape closes it.
export default function DeleteAccountForm() {
  const { markSignedOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const triggerRef = useRef(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (!open && returnFocus.current) {
      triggerRef.current?.focus();
      returnFocus.current = false;
    }
  }, [open]);

  function close() {
    returnFocus.current = true;
    setOpen(false);
    setPassword('');
    setError(null);
  }

  async function handleDelete(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      markSignedOut();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return markSignedOut();
      setError(err.fields?.password ?? err.message);
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <>
        <p className="habit-card__meta">
          Deleting your account permanently removes your login, all of your habits, and all of your check-in history.
          This cannot be undone.
        </p>
        <button ref={triggerRef} type="button" className="button button--danger" onClick={() => setOpen(true)}>
          Delete account…
        </button>
      </>
    );
  }

  return (
    <form className="form confirm" onSubmit={handleDelete} onKeyDown={(e) => e.key === 'Escape' && !busy && close()} noValidate>
      <p>
        <strong>Are you sure?</strong> Everything in your garden will be deleted and cannot be recovered. Enter your
        password to confirm.
      </p>
      {error && <p role="alert" className="form__error">{error}</p>}
      <PasswordField
        id="delete-password"
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="form__actions">
        <button type="button" className="button button--ghost" autoFocus onClick={close} disabled={busy}>
          Keep my account
        </button>
        <button type="submit" className="button button--danger" disabled={busy}>
          {busy ? 'Deleting…' : 'Yes, delete my account'}
        </button>
      </div>
    </form>
  );
}
