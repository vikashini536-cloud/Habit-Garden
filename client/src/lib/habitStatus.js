// Turns the backend's habit and plant data into the words shown on screen.
// The backend decides the facts. These functions only choose the wording.

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STAGE_MESSAGES = {
  seed: 'A tiny beginning. 🌱',
  seedling: 'A new leaf! Keep going. 🌿',
  young: 'Growing stronger every day.',
  growing: 'Look at that growth.',
  mature: "You've been taking good care of this one. 🌳",
  blooming: "It's blooming! 🌸",
};

export function frequencyLabel(habit) {
  if (habit.frequency === 'daily') return 'Every day';
  if (habit.frequency === 'weekdays') return 'Weekdays';
  return habit.weekdays.map((n) => WEEKDAY_NAMES[n - 1]).join(', ');
}

export function todayStatus(habit) {
  if (!habit.today.scheduled) return { key: 'rest', text: 'Resting today. Nothing to water.' };
  if (habit.today.checkedIn) return { key: 'done', text: 'Watered today ✓' };
  return { key: 'due', text: 'Due today' };
}

// The main line about the plant. Recovery is checked first, so a watered plant
// shows the welcome-back message even if it still has recent misses.
export function plantMessage(plant) {
  if (plant.recovering) return "You're back. Let's grow again. 🌱";
  if (plant.wilt !== 'none') return 'Your plant needs some care.';
  return STAGE_MESSAGES[plant.stage];
}

// A gentle note about recent misses. Empty when there is nothing to say.
export function missedMessage(plant) {
  if (plant.recovering || plant.missedRecently === 0) return null;
  const days = plant.missedRecently === 1 ? 'day' : 'days';
  return `${plant.missedRecently} missed ${days} in the last week. Pour a little water to start again.`;
}

export function careSummary(habits) {
  const due = habits.filter((h) => h.today.scheduled && !h.today.checkedIn).length;
  if (due > 0) return `You have ${due} ${due === 1 ? 'habit' : 'habits'} to care for today.`;
  if (habits.some((h) => h.today.scheduled)) return 'Everything scheduled today is watered. 🌱';
  return 'Nothing is scheduled for today. Enjoy the rest.';
}
