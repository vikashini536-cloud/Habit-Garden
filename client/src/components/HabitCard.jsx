import { Link } from 'react-router-dom';
import Plant from './Plant.jsx';
import { frequencyLabel, missedMessage, plantMessage, todayStatus } from '../lib/habitStatus.js';

export default function HabitCard({ habit, busy, feedback, onWater, onUndo }) {
  const status = todayStatus(habit);
  const canWater = habit.today.scheduled && !habit.today.checkedIn;
  const missed = missedMessage(habit.plant);
  const meta = [habit.category, frequencyLabel(habit)].filter(Boolean).join(' · ');

  return (
    <article className="habit-card">
      <Plant stage={habit.plant.stage} wilt={habit.plant.wilt} />

      <div className="habit-card__body">
        <h2 className="habit-card__name">
          <Link to={`/habits/${habit.id}`}>{habit.name}</Link>
        </h2>
        <p className="habit-card__meta">{meta}</p>
        {habit.description && <p className="habit-card__description">{habit.description}</p>}

        <p className={`habit-card__status habit-card__status--${status.key}`}>{status.text}</p>
        <p className="habit-card__message">{plantMessage(habit.plant)}</p>
        {missed && <p className="habit-card__missed">{missed}</p>}

        {canWater && (
          <button
            type="button"
            className="button water-button"
            onClick={() => onWater(habit)}
            disabled={busy}
            aria-label={`Water ${habit.name}`}
          >
            {busy ? 'Watering…' : 'Water'}
          </button>
        )}

        {habit.today.checkedIn && (
          <button
            type="button"
            className="button button--text"
            onClick={() => onUndo(habit)}
            disabled={busy}
            aria-label={`Undo today's check-in for ${habit.name}`}
          >
            Undo today&apos;s check-in
          </button>
        )}

        {feedback && (
          <p role="status" className={`habit-card__feedback habit-card__feedback--${feedback.type}`}>
            {feedback.text}
          </p>
        )}
      </div>
    </article>
  );
}
