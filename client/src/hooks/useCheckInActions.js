import { useCallback, useRef, useState } from 'react';
import { ApiError } from '../api/client.js';
import { checkInHabit, undoCheckIn } from '../api/habits.js';
import { useAuth } from '../auth/AuthContext.jsx';

// Water and undo actions shared by the dashboard and the habit detail page.
// Each action sends one request and passes the server's updated habit to onHabitChanged.
// The backend decides everything: whether the habit is scheduled, and whether the day is today.
export function useCheckInActions({ onHabitChanged }) {
  const { markSignedOut } = useAuth();
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [feedback, setFeedback] = useState({});

  // A ref (not state) is the lock, so two fast clicks cannot both start a request.
  const inFlight = useRef(new Set());

  const run = useCallback(
    async (habitId, request, successText) => {
      if (inFlight.current.has(habitId)) return;
      inFlight.current.add(habitId);
      setBusyIds(new Set(inFlight.current));
      setFeedback((current) => ({ ...current, [habitId]: null }));

      try {
        const result = await request();
        onHabitChanged(result.habit);
        setFeedback((current) => ({ ...current, [habitId]: { type: 'success', text: successText(result) } }));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return markSignedOut();
        const text = err instanceof ApiError && err.status === 400
          ? err.message
          : "We couldn't save that. Please try again.";
        setFeedback((current) => ({ ...current, [habitId]: { type: 'error', text } }));
      } finally {
        inFlight.current.delete(habitId);
        setBusyIds(new Set(inFlight.current));
      }
    },
    [markSignedOut, onHabitChanged],
  );

  const water = useCallback(
    (habit) =>
      run(
        habit.id,
        () => checkInHabit(habit.id),
        ({ created }) => (created ? 'Watered. Nice care today.' : 'Already watered today.'),
      ),
    [run],
  );

  const undo = useCallback(
    (habit) =>
      run(
        habit.id,
        () => undoCheckIn(habit.id, habit.today.date),
        ({ removed }) => (removed ? "Today's check-in was undone." : 'There was no check-in to undo.'),
      ),
    [run],
  );

  return { busyIds, feedback, water, undo };
}
