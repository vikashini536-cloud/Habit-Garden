import { useState } from 'react';
import Field from './Field.jsx';

// Password is hidden by default. The toggle only changes what is displayed.
// It never changes what is stored or sent.
export default function PasswordField({ id, label, value, onChange, error, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <Field id={id} label={label} error={error}>
      <div className="password-input">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          className="password-toggle"
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? 'Hide password' : 'Show password'}
        </button>
      </div>
    </Field>
  );
}
