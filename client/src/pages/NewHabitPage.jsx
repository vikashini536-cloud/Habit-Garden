import { useNavigate } from 'react-router-dom';
import { createHabit } from '../api/habits.js';
import { useAuth } from '../auth/AuthContext.jsx';
import HabitForm from '../components/HabitForm.jsx';
import { todayInTimezone } from '../lib/time.js';

export default function NewHabitPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = todayInTimezone(user.timezone);

  const initialValues = {
    name: '',
    description: '',
    category: '',
    frequency: 'daily',
    startDate: today,
    weekdays: [1, 2, 3, 4, 5],
  };

  async function plantHabit(body) {
    await createHabit(body);
    navigate('/dashboard', { replace: true, state: { notice: 'Your seed has been planted! 🌱' } });
  }

  return (
    <section className="form-page">
      <h1>Plant a new habit</h1>
      <p className="form-page__subtitle">What would you like to grow?</p>
      <HabitForm
        initialValues={initialValues}
        today={today}
        submitLabel="🌱 Plant This Habit"
        cancelTo="/dashboard"
        onSubmit={plantHabit}
      />
    </section>
  );
}
