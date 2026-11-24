import { useState } from 'react';
import { ApiError } from '../api/client.js';
import { changePassword } from '../api/auth.js';
import { useAuth } from '../auth/AuthContext.jsx';
import PasswordField from './PasswordField.jsx';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function ChangePasswordForm() {
  const { markSignedOut } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);
    if (form.newPassword !== form.confirmPassword) {
      setErrors({ confirmPassword: 'The new passwords do not match.' });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      setForm(EMPTY);
      setMessage('Your password has been changed. Other devices have been signed out.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return markSignedOut();
      // Field errors appear under their inputs. Only show a form-level message when there are none.
      setErrors(err.fields ? { ...err.fields } : { form: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {errors.form && <p role="alert" className="form__error">{errors.form}</p>}
      {message && <p role="status" className="dashboard__notice">{message}</p>}

      <PasswordField id="current-password" label="Current password" autoComplete="current-password"
        value={form.currentPassword} onChange={update('currentPassword')} error={errors.currentPassword} />
      <PasswordField id="new-password" label="New password" autoComplete="new-password"
        value={form.newPassword} onChange={update('newPassword')} error={errors.newPassword} />
      <PasswordField id="confirm-password" label="Confirm new password" autoComplete="new-password"
        value={form.confirmPassword} onChange={update('confirmPassword')} error={errors.confirmPassword} />

      <div className="form__actions">
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Saving…' : 'Change password'}
        </button>
      </div>
    </form>
  );
}
