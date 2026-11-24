import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import { listHabits } from '../api/habits.js';
import { useAuth } from '../auth/AuthContext.jsx';
import HabitCard from '../components/HabitCard.jsx';
import StateMessage from '../components/StateMessage.jsx';
import { useCheckInActions } from '../hooks/useCheckInActions.js';
import { careSummary } from '../lib/habitStatus.js';
import { greetingFor, hourInTimezone } from '../lib/time.js';

export default function DashboardPage() {
  const { user, markSignedOut } = useAuth();
  const location = useLocation();

  const [list, setList] = useState({ status: 'loading', habits: [], error: null });
  const [notice, setNotice] = useState(location.state?.notice ?? null);

  const loadHabits = useCallback(async () => {
    setList((current) => ({ ...current, status: 'loading', error: null }));
    try {
      const { habits } = await listHabits();
      setList({ status: 'ready', habits, error: null });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return markSignedOut();
      setList({ status: 'error', habits: [], error: err.message });
    }
  }, [markSignedOut]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // The "seed planted" notice fades away after a few seconds.
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const replaceHabit = useCallback(
    (habit) =>
      setList((current) => ({
        ...current,
        habits: current.habits.map((h) => (h.id === habit.id ? habit : h)),
      })),
    [],
  );

  const { busyIds, feedback, water, undo } = useCheckInActions({ onHabitChanged: replaceHabit });

  if (list.status === 'loading') return <StateMessage>Loading your garden…</StateMessage>;

  if (list.status === 'error') {
    return (
      <StateMessage role="alert" action={<button type="button" className="button" onClick={loadHabits}>Try again</button>}>
        {list.error}
      </StateMessage>
    );
  }

  const { habits } = list;

  if (habits.length === 0) {
    return (
      <section className="empty-state">
        <div className="empty-state__seed" aria-hidden="true">🌱</div>
        <h1>Your garden is waiting for its first seed.</h1>
        <p>Nothing is growing here yet. Choose a habit you&apos;d like to nurture and plant your first seed.</p>
        <Link to="/habits/new" className="button">＋ Plant a Habit</Link>
      </section>
    );
  }

  const greeting = greetingFor(hourInTimezone(user.timezone));

  return (
    <section className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1>{greeting}, {user.name}.</h1>
          <p className="dashboard__subtitle">Your garden is growing.</p>
          <p className="dashboard__care">{careSummary(habits)}</p>
        </div>
        <Link to="/habits/new" className="button button--ghost">＋ Plant a Habit</Link>
      </header>

      {notice && <p role="status" className="dashboard__notice">{notice}</p>}

      <div className="habit-grid">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            busy={busyIds.has(habit.id)}
            feedback={feedback[habit.id]}
            onWater={water}
            onUndo={undo}
          />
        ))}
      </div>
    </section>
  );
}
