import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Field from './Field.jsx';

const WEEKDAYS = [
  { n: 1, label: 'Mon' }, { n: 2, label: 'Tue' }, { n: 3, label: 'Wed' }, { n: 4, label: 'Thu' },
  { n: 5, label: 'Fri' }, { n: 6, label: 'Sat' }, { n: 7, label: 'Sun' },
];

// Converts a habit from the API into the values the form edits.
export function toFormValues(habit) {
  return {
    name: habit.name,
    description: habit.description ?? '',
    category: habit.category ?? '',
    frequency: habit.frequency,
    startDate: habit.startDate,
    weekdays: habit.weekdays,
  };
}

function buildBody(form) {
  return {
    name: form.name,
    description: form.description,
    category: form.category,
    frequency: form.frequency,
    startDate: form.startDate,
    ...(form.frequency === 'custom' ? { weekdays: form.weekdays } : {}),
  };
}

// Used for both "plant a new habit" and "edit habit". The page decides what happens on success.
export default function HabitForm({ initialValues, today, submitLabel, cancelTo, onSubmit }) {
  const { markSignedOut } = useAuth();
  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  function toggleWeekday(n) {
    setForm((current) => ({
      ...current,
      weekdays: current.weekdays.includes(n)
        ? current.weekdays.filter((d) => d !== n)
        : [...current.weekdays, n].sort(),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrors({});
    try {
      await onSubmit(buildBody(form));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return markSignedOut();
      setErrors({ form: err.message, ...(err.fields ?? {}) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {errors.form && <p role="alert" className="form__error">{errors.form}</p>}

      <Field id="habit-name" label="Habit name" error={errors.name}>
        <input id="habit-name" value={form.name} onChange={update('name')} maxLength={100} required />
      </Field>

      <Field id="habit-description" label="Short description" error={errors.description}>
        <input id="habit-description" value={form.description} onChange={update('description')} maxLength={255} />
      </Field>

      <Field id="habit-category" label="Category (optional)" error={errors.category}>
        <input id="habit-category" value={form.category} onChange={update('category')} maxLength={40} />
      </Field>

      <fieldset className="field">
        <legend>Preferred frequency</legend>
        <div className="choice-row">
          {[['daily', 'Every day'], ['weekdays', 'Weekdays'], ['custom', 'Custom days']].map(([value, label]) => (
            <label key={value} className="choice">
              <input type="radio" name="frequency" value={value} checked={form.frequency === value} onChange={update('frequency')} />
              {label}
            </label>
          ))}
        </div>
        {errors.frequency && <p className="field__error">{errors.frequency}</p>}

        {form.frequency === 'custom' && (
          <div className="choice-row" role="group" aria-label="Days of the week">
            {WEEKDAYS.map(({ n, label }) => (
              <label key={n} className="choice">
                <input type="checkbox" checked={form.weekdays.includes(n)} onChange={() => toggleWeekday(n)} />
                {label}
              </label>
            ))}
          </div>
        )}
        {errors.weekdays && <p className="field__error">{errors.weekdays}</p>}
      </fieldset>

      <Field id="habit-start" label="Starting date" error={errors.startDate}>
        <input id="habit-start" type="date" value={form.startDate} max={today} onChange={update('startDate')} />
      </Field>

      <div className="form__actions">
        <Link to={cancelTo} className="button button--ghost">Cancel</Link>
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
