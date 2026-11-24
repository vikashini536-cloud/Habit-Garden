import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import { getHabit, updateHabit } from '../api/habits.js';
import { useAuth } from '../auth/AuthContext.jsx';
import DeleteHabitPanel from '../components/DeleteHabitPanel.jsx';
import HabitForm, { toFormValues } from '../components/HabitForm.jsx';
import StateMessage from '../components/StateMessage.jsx';
import { todayInTimezone } from '../lib/time.js';

export default function EditHabitPage() {
  const { habitId } = useParams();
  const { user, markSignedOut } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', habit: null, error: null });

  useEffect(() => {
    let active = true;
    getHabit(habitId)
      .then(({ habit }) => {
        if (active) setState({ status: 'ready', habit, error: null });
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) return markSignedOut();
        const status = err instanceof ApiError && err.status === 404 ? 'missing' : 'error';
        setState({ status, habit: null, error: err.message });
      });
    return () => {
      active = false;
    };
  }, [habitId, markSignedOut]);

  if (state.status === 'loading') return <StateMessage>Loading habit…</StateMessage>;

  if (state.status === 'missing') {
    return (
      <StateMessage action={<Link to="/dashboard" className="button">Back to garden</Link>}>
        This habit could not be found.
      </StateMessage>
    );
  }

  if (state.status === 'error') return <StateMessage role="alert">{state.error}</StateMessage>;

  const { habit } = state;

  async function saveChanges(body) {
    await updateHabit(habit.id, body);
    navigate(`/habits/${habit.id}`, { replace: true, state: { notice: 'Changes saved.' } });
  }

  return (
    <section className="form-page">
      <h1>Edit habit</h1>
      <p className="form-page__subtitle">{habit.name}</p>
      <HabitForm
        initialValues={toFormValues(habit)}
        today={todayInTimezone(user.timezone)}
        submitLabel="Save changes"
        cancelTo={`/habits/${habit.id}`}
        onSubmit={saveChanges}
      />
      <DeleteHabitPanel habit={habit} />
    </section>
  );
}
