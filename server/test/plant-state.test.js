import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { computePlantState } from '../src/services/plantState.js';
import { addDays } from '../src/utils/dates.js';
import { EVERY_DAY, MON_TO_FRI } from '../src/utils/schedule.js';

// Fixed "today" so the tests never depend on the real clock.
const TODAY = '2026-11-24'; // Tuesday

function plant({ startDate = addDays(TODAY, -30), weekdays = EVERY_DAY, checkIns = [] } = {}) {
  return computePlantState({ startDate, weekdays, checkInDates: new Set(checkIns), today: TODAY });
}

describe('growth stage (lifetime check-ins)', () => {
  test('stage follows the number of check-ins', () => {
    const cases = [[0, 'seed'], [1, 'seedling'], [3, 'seedling'], [4, 'young'], [10, 'growing'], [20, 'mature'], [40, 'blooming']];
    for (const [count, expected] of cases) {
      const checkIns = Array.from({ length: count }, (_, i) => addDays('2026-01-01', i));
      const state = plant({ startDate: '2026-01-01', checkIns });
      assert.equal(state.stage, expected, `${count} check-ins should be ${expected}`);
    }
  });

  test('missed days do NOT reduce growth', () => {
    // Four check-ins long ago, then nothing for weeks. Growth stays "young", but the plant wilts.
    const checkIns = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'];
    const state = plant({ startDate: '2026-01-01', checkIns });
    assert.equal(state.stage, 'young');
    assert.equal(state.wilt, 'wilted');
  });
});

describe('missed days and wilting', () => {
  test('a habit started today has no missed days', () => {
    const state = plant({ startDate: TODAY });
    assert.equal(state.missedRecently, 0);
    assert.equal(state.wilt, 'none');
    assert.equal(state.scheduledToday, true);
  });

  test('today is never counted as missed, because the day is not over', () => {
    // Started yesterday, nothing done. Only yesterday is missed, not today.
    const state = plant({ startDate: addDays(TODAY, -1) });
    assert.equal(state.missedRecently, 1);
    assert.equal(state.wilt, 'slight');
  });

  test('a past start date counts missed days inside the last 7 days only', () => {
    // Started 10 days ago, daily, no check-ins. Window = last 7 days up to yesterday.
    const state = plant({ startDate: addDays(TODAY, -10) });
    assert.equal(state.missedRecently, 7);
    assert.equal(state.wilt, 'wilted');
  });

  test('one completed day inside the window reduces the count', () => {
    // Started 3 days ago, checked in 2 days ago. Missed: 3 days ago and yesterday.
    const state = plant({ startDate: addDays(TODAY, -3), checkIns: [addDays(TODAY, -2)] });
    assert.equal(state.missedRecently, 2);
    assert.equal(state.wilt, 'wilted');
  });

  test('weekend days are not counted as missed for a Monday-Friday habit', () => {
    // Started Mon 16 Nov. Checked in Tue 17, Wed 18, Thu 19, Fri 20. Missed only Mon 23.
    // Sat 21 and Sun 22 must not count, even though nothing was done on them.
    const state = plant({
      startDate: '2026-11-16',
      weekdays: MON_TO_FRI,
      checkIns: ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'],
    });
    assert.equal(state.missedRecently, 1);
    assert.equal(state.wilt, 'slight');
  });

  test('a future-looking day is never missed', () => {
    const state = plant({ startDate: TODAY });
    assert.equal(state.missedRecently, 0);
  });
});

describe('recovery', () => {
  test('checking in today restores the plant, even with recent misses', () => {
    const state = plant({ startDate: addDays(TODAY, -10), checkIns: [TODAY] });
    assert.equal(state.wilt, 'none');
    assert.equal(state.recovering, true);
    assert.equal(state.missedRecently, 7, 'the history of misses is kept, only the appearance recovers');
  });

  test('no check-in today means the plant still shows the wilt', () => {
    const state = plant({ startDate: addDays(TODAY, -10) });
    assert.equal(state.checkedInToday, false);
    assert.equal(state.recovering, false);
    assert.equal(state.wilt, 'wilted');
  });
});
