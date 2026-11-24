import { addDays } from '../utils/dates.js';
import { isScheduled, scheduledDatesBetween } from '../utils/schedule.js';
import { PLANT_STAGES, RECENT_WINDOW_DAYS, WILT_THRESHOLDS } from '../config/plant.js';

// Pure function: no database, no clock. Give it the facts, it returns the plant.
// The frontend never decides the plant state. It only displays what this returns.
//
// Rules:
//   stage        comes from the lifetime number of check-ins. It never goes down.
//   missedRecently counts scheduled days in the last RECENT_WINDOW_DAYS, up to YESTERDAY.
//                  Today is never counted (the day is not over). Future days are never counted.
//                  Days before the habit's start date are never counted.
//   wilt          depends on missedRecently, but checking in today restores the plant.
export function computePlantState({ startDate, weekdays, checkInDates, today }) {
  const yesterday = addDays(today, -1);
  const windowStartCandidate = addDays(today, -RECENT_WINDOW_DAYS);
  const windowStart = startDate > windowStartCandidate ? startDate : windowStartCandidate;

  const totalCheckIns = checkInDates.size;
  const checkedInToday = checkInDates.has(today);
  const missedRecently = scheduledDatesBetween(windowStart, yesterday, weekdays)
    .filter((date) => !checkInDates.has(date))
    .length;

  let wilt = 'none';
  if (!checkedInToday) {
    if (missedRecently >= WILT_THRESHOLDS.wilted) wilt = 'wilted';
    else if (missedRecently >= WILT_THRESHOLDS.slight) wilt = 'slight';
  }

  const stage = PLANT_STAGES.findLast((s) => totalCheckIns >= s.minCheckIns).key;

  return {
    stage,
    totalCheckIns,
    checkedInToday,
    scheduledToday: startDate <= today && isScheduled(weekdays, today),
    missedRecently,
    wilt,
    // True when the plant has recent misses but was watered today.
    recovering: checkedInToday && missedRecently > 0,
  };
}
