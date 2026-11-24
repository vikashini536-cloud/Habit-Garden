import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { login } from '../api/auth.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Field from '../components/Field.jsx';
import PasswordField from '../components/PasswordField.jsx';

export default function LoginPage() {
  const { status, signIn } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to={location.state?.from ?? '/dashboard'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const { user } = await login(form.email, form.password);
      signIn(user);
    } catch (err) {
      setErrors({ form: err.message, ...(err.fields ?? {}) });
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <h1>Welcome back to your garden.</h1>
      <p className="auth-page__subtitle">Your plants have been waiting for you.</p>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {errors.form && <p role="alert" className="form__error">{errors.form}</p>}

        <Field id="email" label="Email" error={errors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            aria-invalid={Boolean(errors.email)}
          />
        </Field>

        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
        />

        <button type="submit" className="button button--wide" disabled={submitting}>
          {submitting ? 'Entering…' : 'Enter My Garden 🌿'}
        </button>
      </form>

      <p className="auth-page__switch">
        New here? <Link to="/signup">Plant your first habit.</Link>
      </p>
    </section>
  );
}
