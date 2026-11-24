import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import { deleteHabit } from '../api/habits.js';
import { useAuth } from '../auth/AuthContext.jsx';

// Deleting is two steps: press the button, then confirm. The habit is only removed on confirm.
// The safe choice ("Keep it") is focused when the panel opens. Escape closes the panel and
// returns focus to the delete button.
export default function DeleteHabitPanel({ habit }) {
  const { markSignedOut } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const triggerRef = useRef(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (!confirming && returnFocus.current) {
      triggerRef.current?.focus();
      returnFocus.current = false;
    }
  }, [confirming]);

  function closeConfirm() {
    returnFocus.current = true;
    setConfirming(false);
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteHabit(habit.id);
      navigate('/dashboard', { replace: true, state: { notice: `${habit.name} was removed from your garden.` } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return markSignedOut();
      setError(err.message);
      setBusy(false);
    }
  }

  function onPanelKeyDown(event) {
    if (event.key === 'Escape' && !busy) closeConfirm();
  }

  return (
    <section className="danger-zone">
      <h2>Delete this habit</h2>
      {!confirming ? (
        <button ref={triggerRef} type="button" className="button button--danger" onClick={() => setConfirming(true)}>
          Delete habit
        </button>
      ) : (
        <div role="alertdialog" aria-labelledby="delete-habit-title" className="confirm" onKeyDown={onPanelKeyDown}>
          <p id="delete-habit-title">
            <strong>Delete “{habit.name}”?</strong> Its plant and all of its check-in history will be removed permanently.
          </p>
          {error && <p role="alert" className="form__error">{error}</p>}
          <div className="form__actions">
            <button type="button" className="button button--ghost" autoFocus onClick={closeConfirm} disabled={busy}>
              Keep it
            </button>
            <button type="button" className="button button--danger" onClick={confirmDelete} disabled={busy}>
              {busy ? 'Deleting…' : 'Yes, delete habit'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
