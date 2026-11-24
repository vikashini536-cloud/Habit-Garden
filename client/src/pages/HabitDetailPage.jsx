import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import { getHabit } from '../api/habits.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Plant from '../components/Plant.jsx';
import StateMessage from '../components/StateMessage.jsx';
import { useCheckInActions } from '../hooks/useCheckInActions.js';
import { frequencyLabel, missedMessage, plantMessage, todayStatus } from '../lib/habitStatus.js';
import { formatDay } from '../lib/time.js';

export default function HabitDetailPage() {
  const { habitId } = useParams();
  const location = useLocation();
  const { markSignedOut } = useAuth();
  const [state, setState] = useState({ status: 'loading', habit: null, checkInDates: [], error: null });

  const load = useCallback(async () => {
    try {
      const data = await getHabit(habitId);
      setState({ status: 'ready', habit: data.habit, checkInDates: data.checkInDates, error: null });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return markSignedOut();
      const status = err instanceof ApiError && err.status === 404 ? 'missing' : 'error';
      setState({ status, habit: null, checkInDates: [], error: err.message });
    }
  }, [habitId, markSignedOut]);

  useEffect(() => {
    load();
  }, [load]);

  // After any water or undo, reload the detail so the history list is correct too.
  const { busyIds, feedback, water, undo } = useCheckInActions({ onHabitChanged: load });

  if (state.status === 'loading') return <StateMessage>Loading habit…</StateMessage>;
  if (state.status === 'missing') {
    return <StateMessage action={<Link to="/dashboard" className="button">Back to garden</Link>}>This habit could not be found.</StateMessage>;
  }
  if (state.status === 'error') return <StateMessage role="alert">{state.error}</StateMessage>;

  const { habit, checkInDates } = state;
  const { plant } = habit;
  const status = todayStatus(habit);
  const missed = missedMessage(plant);
  const meta = [habit.category, frequencyLabel(habit)].filter(Boolean).join(' · ');
  const canWater = habit.today.scheduled && !habit.today.checkedIn;
  const busy = busyIds.has(habit.id);
  const notice = location.state?.notice;

  return (
    <section className="detail">
      <Link to="/dashboard" className="back-link">← Back to garden</Link>
      {notice && <p role="status" className="dashboard__notice">{notice}</p>}

      <div className="detail__grid">
        <div className="detail__plant">
          <Plant stage={plant.stage} wilt={plant.wilt} />
        </div>

        <div className="detail__summary">
          <h1>{habit.name}</h1>
          <p className="habit-card__meta">{meta}</p>
          {habit.description && <p>{habit.description}</p>}

          <p className={`habit-card__status habit-card__status--${status.key}`}>{status.text}</p>
          <p className="habit-card__message">{plantMessage(plant)}</p>
          {missed && <p className="habit-card__missed">{missed}</p>}

          <div className="detail__actions">
            {canWater && (
              <button type="button" className="button water-button" onClick={() => water(habit)} disabled={busy}>
                {busy ? 'Watering…' : 'Water'}
              </button>
            )}
            {habit.today.checkedIn && (
              <button type="button" className="button button--ghost" onClick={() => undo(habit)} disabled={busy}>
                Undo today&apos;s check-in
              </button>
            )}
            <Link to={`/habits/${habit.id}/edit`} className="button button--ghost">Edit habit</Link>
          </div>

          {feedback[habit.id] && (
            <p role="status" className={`habit-card__feedback habit-card__feedback--${feedback[habit.id].type}`}>
              {feedback[habit.id].text}
            </p>
          )}

          <dl className="stats">
            <div>
              <dt>Total check-ins</dt>
              <dd>{plant.totalCheckIns}</dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{formatDay(habit.startDate)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <section className="history">
        <h2>Check-in history</h2>
        <p className="habit-card__meta">Days in the last 90 days, newest first.</p>
        {checkInDates.length === 0 ? (
          <p>No check-ins in the last 90 days yet.</p>
        ) : (
          <ul className="history__list">
            {[...checkInDates].reverse().map((date) => (
              <li key={date}>{formatDay(date)}</li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
