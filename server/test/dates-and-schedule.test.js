import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, isValidDateString, todayInTimezone } from '../src/utils/dates.js';
import {
  weekdayBit,
  isScheduled,
  scheduledDatesBetween,
  weekdaysToMask,
  maskToWeekdays,
  MON_TO_FRI,
  EVERY_DAY,
} from '../src/utils/schedule.js';

// Known calendar facts used by the tests:
//   2026-11-23 is a Monday, 2026-11-24 a Tuesday, 2026-11-21 a Saturday, 2026-11-22 a Sunday.

describe('date strings', () => {
  test('accepts real calendar dates and rejects impossible ones', () => {
    assert.equal(isValidDateString('2026-11-24'), true);
    assert.equal(isValidDateString('2028-02-29'), true, 'leap day exists in 2028');
    assert.equal(isValidDateString('2026-02-29'), false, '2026 is not a leap year');
    assert.equal(isValidDateString('2026-02-30'), false);
    assert.equal(isValidDateString('2026-13-01'), false);
    assert.equal(isValidDateString('24-11-2026'), false);
    assert.equal(isValidDateString('2026-11-24T10:00'), false);
    assert.equal(isValidDateString(null), false);
  });

  test('addDays handles month ends, year ends and leap years', () => {
    assert.equal(addDays('2026-11-30', 1), '2026-12-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2028-02-28', 1), '2028-02-29');
    assert.equal(addDays('2026-11-24', -1), '2026-11-23');
    assert.equal(addDays('2026-11-24', 0), '2026-11-24');
  });

  test('todayInTimezone gives the local calendar date, which differs by zone', () => {
    // 20:30 UTC on Nov 24 is already 02:00 on Nov 25 in India, but still Nov 24 in New York.
    const instant = new Date('2026-11-24T20:30:00Z');
    assert.equal(todayInTimezone('Asia/Kolkata', instant), '2026-11-25');
    assert.equal(todayInTimezone('America/New_York', instant), '2026-11-24');
    assert.equal(todayInTimezone('UTC', instant), '2026-11-24');
  });
});

describe('weekday schedule', () => {
  test('weekdayBit maps Monday=1 ... Sunday=64', () => {
    assert.equal(weekdayBit('2026-11-23'), 1, 'Monday');
    assert.equal(weekdayBit('2026-11-21'), 32, 'Saturday');
    assert.equal(weekdayBit('2026-11-22'), 64, 'Sunday');
  });

  test('a Monday-Friday habit is not scheduled on weekends', () => {
    assert.equal(isScheduled(MON_TO_FRI, '2026-11-23'), true, 'Monday is scheduled');
    assert.equal(isScheduled(MON_TO_FRI, '2026-11-21'), false, 'Saturday is not');
    assert.equal(isScheduled(MON_TO_FRI, '2026-11-22'), false, 'Sunday is not');
  });

  test('scheduledDatesBetween returns only scheduled days, inclusive', () => {
    // Mon 16 Nov to Sun 22 Nov: five weekdays.
    assert.deepEqual(scheduledDatesBetween('2026-11-16', '2026-11-22', MON_TO_FRI), [
      '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20',
    ]);
    assert.deepEqual(scheduledDatesBetween('2026-11-24', '2026-11-23', EVERY_DAY), [], 'empty range');
  });

  test('custom weekdays round-trip through the bitmask', () => {
    assert.equal(weekdaysToMask([1, 3]), 5);
    assert.deepEqual(maskToWeekdays(MON_TO_FRI), [1, 2, 3, 4, 5]);
    assert.deepEqual(maskToWeekdays(EVERY_DAY), [1, 2, 3, 4, 5, 6, 7]);
  });
});
