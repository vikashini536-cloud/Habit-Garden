import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { signup } from '../api/auth.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Field from '../components/Field.jsx';
import PasswordField from '../components/PasswordField.jsx';

export default function SignupPage() {
  const { status, signIn } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { user } = await signup({ ...form, timezone });
      signIn(user);
    } catch (err) {
      setErrors({ form: err.message, ...(err.fields ?? {}) });
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <h1>Let&apos;s plant your first habit.</h1>
      <p className="auth-page__subtitle">Create your account and start building your garden.</p>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {errors.form && <p role="alert" className="form__error">{errors.form}</p>}

        <Field id="name" label="Name" error={errors.name}>
          <input id="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>

        <Field id="email" label="Email" error={errors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>

        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
        />

        <button type="submit" className="button button--wide" disabled={submitting}>
          {submitting ? 'Planting…' : 'Plant My Garden 🌱'}
        </button>
      </form>

      <p className="auth-page__switch">
        Already growing with us? <Link to="/login">Log in.</Link>
      </p>
    </section>
  );
}
