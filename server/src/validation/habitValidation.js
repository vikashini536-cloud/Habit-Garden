import { addDays, isValidDateString } from '../utils/dates.js';
import { EVERY_DAY, FREQUENCY, MON_TO_FRI, weekdaysToMask } from '../utils/schedule.js';

const FREQUENCIES = Object.values(FREQUENCY);
// How far back a habit may start. Five years is plenty for a personal tracker.
const MAX_START_AGE_DAYS = 365 * 5;

// Checks a habit submitted by the frontend. Returns field errors, or clean values to store.
export function validateHabit(body, today) {
  const errors = {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) errors.name = 'Please give your habit a name.';
  else if (name.length > 100) errors.name = 'Name must be 100 characters or fewer.';

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length > 255) errors.description = 'Description must be 255 characters or fewer.';

  const category = typeof body.category === 'string' ? body.category.trim() : '';
  if (category.length > 40) errors.category = 'Category must be 40 characters or fewer.';

  const frequency = body.frequency;
  if (!FREQUENCIES.includes(frequency)) {
    errors.frequency = 'Choose a frequency: daily, weekdays, or custom.';
  }

  let weekdays;
  if (frequency === FREQUENCY.DAILY) {
    weekdays = EVERY_DAY;
  } else if (frequency === FREQUENCY.WEEKDAYS) {
    weekdays = MON_TO_FRI;
  } else if (frequency === FREQUENCY.CUSTOM) {
    const days = body.weekdays;
    const valid =
      Array.isArray(days) &&
      days.length > 0 &&
      days.every((n) => Number.isInteger(n) && n >= 1 && n <= 7) &&
      new Set(days).size === days.length;
    if (valid) weekdays = weekdaysToMask(days);
    else errors.weekdays = 'Choose at least one day (1 = Monday ... 7 = Sunday), with no repeats.';
  }

  // startDate is optional. When it is missing, the caller decides the default.
  let startDate;
  if (body.startDate !== undefined) {
    if (!isValidDateString(body.startDate)) {
      errors.startDate = 'Enter a valid start date.';
    } else if (body.startDate > today) {
      errors.startDate = 'Start date cannot be in the future.';
    } else if (body.startDate < addDays(today, -MAX_START_AGE_DAYS)) {
      errors.startDate = 'Start date is too far in the past.';
    } else {
      startDate = body.startDate;
    }
  }

  return {
    errors,
    values: {
      name,
      description: description || null,
      category: category || null,
      frequency,
      weekdays,
      startDate,
    },
  };
}
