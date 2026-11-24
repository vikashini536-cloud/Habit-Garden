import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { pool } from '../src/config/db.js';
import { createUser, createSession } from '../src/services/authService.js';
import { addDays, todayInTimezone } from '../src/utils/dates.js';
import { weekdayBit } from '../src/utils/schedule.js';

// These tests use the real database (the one in server/.env) and real HTTP requests.
// They create their own users with a unique suffix and delete them at the end.
// Users are created directly in the database (not through the signup route) so the
// auth rate limit is not used up by the test setup.

const RUN = Date.now().toString(36);
const TZ = 'UTC';
const createdUserIds = [];
let server;
let baseUrl;
let owner;
let other;

async function makeUser(label, timezone = TZ) {
  const user = await createUser({
    name: label,
    email: `${label}.${RUN}@test.local`,
    password: 'Test-Password-1',
    timezone,
  });
  createdUserIds.push(user.id);
  const token = await createSession(user.id);
  return { ...user, cookie: `hg_session=${token}` };
}

// Sends one HTTP request. Every request carries the allowed Origin, so the CSRF check passes.
async function call(method, path, user, body) {
  const headers = { Origin: env.appOrigin };
  if (user) headers.Cookie = user.cookie;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

function todayFor(user) {
  return todayInTimezone(user.timezone);
}

function isoWeekday(dateString) {
  return Math.log2(weekdayBit(dateString)) + 1; // Monday=1 ... Sunday=7
}

async function makeHabit(user, overrides = {}) {
  const { status, data } = await call('POST', '/api/habits', user, {
    name: 'Test habit',
    frequency: 'daily',
    ...overrides,
  });
  assert.equal(status, 201, `habit creation failed: ${JSON.stringify(data)}`);
  return data.habit;
}

async function countCheckIns(habitId) {
  const [[row]] = await pool.execute('SELECT COUNT(*) AS n FROM check_ins WHERE habit_id = ?', [habitId]);
  return row.n;
}

before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  owner = await makeUser('owner');
  other = await makeUser('other');
});

after(async () => {
  for (const id of createdUserIds) {
    await pool.execute('DELETE FROM users WHERE id = ?', [id]); // cascades to sessions, habits, check-ins
  }
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

describe('unauthorized access', () => {
  test('every habit route rejects requests with no session', async () => {
    assert.equal((await call('GET', '/api/habits')).status, 401);
    assert.equal((await call('POST', '/api/habits', undefined, { name: 'x', frequency: 'daily' })).status, 401);
    assert.equal((await call('GET', '/api/habits/1')).status, 401);
    assert.equal((await call('PUT', '/api/habits/1', undefined, {})).status, 401);
    assert.equal((await call('DELETE', '/api/habits/1')).status, 401);
    assert.equal((await call('POST', '/api/habits/1/checkins')).status, 401);
    assert.equal((await call('DELETE', '/api/habits/1/checkins/2026-11-24')).status, 401);
  });

  test('a fake or expired session cookie is rejected', async () => {
    const fake = { cookie: 'hg_session=not-a-real-token' };
    assert.equal((await call('GET', '/api/habits', fake)).status, 401);
  });

  test('a request from a foreign origin is blocked before reaching the habit code', async () => {
    const response = await fetch(`${baseUrl}/api/habits`, {
      method: 'POST',
      headers: { Origin: 'https://evil.example', Cookie: owner.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x', frequency: 'daily' }),
    });
    assert.equal(response.status, 403);
  });
});

describe('habit CRUD', () => {
  test('create, list, get, edit and delete a habit', async () => {
    const today = todayFor(owner);

    const created = await call('POST', '/api/habits', owner, {
      name: 'Morning meditation',
      description: '10 minutes',
      category: 'mind',
      frequency: 'daily',
    });
    assert.equal(created.status, 201);
    const habit = created.data.habit;
    assert.equal(habit.name, 'Morning meditation');
    assert.equal(habit.frequency, 'daily');
    assert.deepEqual(habit.weekdays, [1, 2, 3, 4, 5, 6, 7]);
    assert.equal(habit.startDate, today, 'start date defaults to today');
    assert.equal(habit.today.scheduled, true);
    assert.equal(habit.plant.stage, 'seed');

    const list = await call('GET', '/api/habits', owner);
    assert.equal(list.status, 200);
    assert.ok(list.data.habits.some((h) => h.id === habit.id));

    const detail = await call('GET', `/api/habits/${habit.id}`, owner);
    assert.equal(detail.status, 200);
    assert.equal(detail.data.habit.id, habit.id);
    assert.ok(Array.isArray(detail.data.checkInDates));

    const edited = await call('PUT', `/api/habits/${habit.id}`, owner, {
      name: 'Evening walk',
      frequency: 'weekdays',
      startDate: today,
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.data.habit.name, 'Evening walk');
    assert.deepEqual(edited.data.habit.weekdays, [1, 2, 3, 4, 5]);

    const deleted = await call('DELETE', `/api/habits/${habit.id}`, owner);
    assert.equal(deleted.status, 200);
    assert.equal((await call('GET', `/api/habits/${habit.id}`, owner)).status, 404);
  });

  test('invalid habit input returns field-level errors', async () => {
    const today = todayFor(owner);
    const cases = [
      [{ name: '', frequency: 'daily' }, 'name'],
      [{ name: 'x'.repeat(101), frequency: 'daily' }, 'name'],
      [{ name: 'ok', frequency: 'hourly' }, 'frequency'],
      [{ name: 'ok', frequency: 'custom', weekdays: [] }, 'weekdays'],
      [{ name: 'ok', frequency: 'custom', weekdays: [1, 1] }, 'weekdays'],
      [{ name: 'ok', frequency: 'custom', weekdays: [0, 8] }, 'weekdays'],
      [{ name: 'ok', frequency: 'daily', startDate: addDays(today, 1) }, 'startDate'],
      [{ name: 'ok', frequency: 'daily', startDate: '2026-02-30' }, 'startDate'],
    ];
    for (const [body, field] of cases) {
      const response = await call('POST', '/api/habits', owner, body);
      assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(body)}`);
      assert.ok(response.data.fields[field], `expected a "${field}" error`);
    }
  });

  test('a habit created with a past start date is accepted', async () => {
    const start = addDays(todayFor(owner), -10);
    const habit = await makeHabit(owner, { name: 'Old start', startDate: start });
    assert.equal(habit.startDate, start);
  });

  test('the frontend cannot choose the owner: a userId in the body is ignored', async () => {
    const response = await call('POST', '/api/habits', other, { name: 'Mine', frequency: 'daily', userId: owner.id });
    assert.equal(response.status, 201);
    const ownerList = await call('GET', '/api/habits', owner);
    assert.ok(!ownerList.data.habits.some((h) => h.id === response.data.habit.id));
  });
});

describe('check-ins', () => {
  test('checking in a scheduled habit creates one record and duplicates are not stored', async () => {
    const habit = await makeHabit(owner, { name: 'Water', frequency: 'daily' });

    const first = await call('POST', `/api/habits/${habit.id}/checkins`, owner);
    assert.equal(first.status, 201);
    assert.equal(first.data.created, true);
    assert.equal(first.data.habit.today.checkedIn, true);

    const second = await call('POST', `/api/habits/${habit.id}/checkins`, owner);
    assert.equal(second.status, 200, 'a repeated check-in is safe and reports created=false');
    assert.equal(second.data.created, false);

    assert.equal(await countCheckIns(habit.id), 1);
  });

  test('simultaneous check-ins (double-click, many tabs) create exactly one record', async () => {
    const habit = await makeHabit(owner, { name: 'Race test', frequency: 'daily' });

    const responses = await Promise.all(
      Array.from({ length: 6 }, () => call('POST', `/api/habits/${habit.id}/checkins`, owner)),
    );

    const created = responses.filter((r) => r.status === 201).length;
    assert.equal(created, 1, 'exactly one request should create the check-in');
    assert.equal(await countCheckIns(habit.id), 1);
  });

  test('a habit not scheduled today cannot be checked in', async () => {
    const today = todayFor(owner);
    const notToday = (isoWeekday(today) % 7) + 1; // a different weekday
    const habit = await makeHabit(owner, { frequency: 'custom', weekdays: [notToday] });

    const response = await call('POST', `/api/habits/${habit.id}/checkins`, owner);
    assert.equal(response.status, 400);
    assert.equal(await countCheckIns(habit.id), 0);
  });

  test('undo removes today only; past dates cannot be changed', async () => {
    const today = todayFor(owner);
    const habit = await makeHabit(owner, { name: 'Undo test', frequency: 'daily' });
    await call('POST', `/api/habits/${habit.id}/checkins`, owner);

    const pastUndo = await call('DELETE', `/api/habits/${habit.id}/checkins/${addDays(today, -1)}`, owner);
    assert.equal(pastUndo.status, 400);
    assert.equal(await countCheckIns(habit.id), 1, 'a past undo must not change anything');

    const futureUndo = await call('DELETE', `/api/habits/${habit.id}/checkins/${addDays(today, 1)}`, owner);
    assert.equal(futureUndo.status, 400);

    const undo = await call('DELETE', `/api/habits/${habit.id}/checkins/${today}`, owner);
    assert.equal(undo.status, 200);
    assert.equal(undo.data.removed, true);
    assert.equal(await countCheckIns(habit.id), 0);

    const undoAgain = await call('DELETE', `/api/habits/${habit.id}/checkins/${today}`, owner);
    assert.equal(undoAgain.data.removed, false);
  });
});

describe('scheduling rules through the API', () => {
  test('past start: each scheduled missed day in the last 7 days counts, and the plant wilts', async () => {
    const habit = await makeHabit(owner, { name: 'Lapsed', frequency: 'daily', startDate: addDays(todayFor(owner), -10) });
    assert.equal(habit.plant.missedRecently, 7);
    assert.equal(habit.plant.wilt, 'wilted');
    assert.equal(habit.plant.stage, 'seed', 'no check-ins yet, so still a seed');
  });

  test('unscheduled days are not missed, and checking in restores the plant', async () => {
    const today = todayFor(owner);
    // Only the weekday of today is scheduled. In the last 7 days (not counting today)
    // there is exactly one of that weekday, so exactly one day should count as missed.
    const habit = await makeHabit(owner, {
      name: 'Once a week',
      frequency: 'custom',
      weekdays: [isoWeekday(today)],
      startDate: addDays(today, -14),
    });
    assert.equal(habit.plant.missedRecently, 1);
    assert.equal(habit.plant.wilt, 'slight');
    assert.equal(habit.today.scheduled, true, 'today is scheduled');

    const checked = await call('POST', `/api/habits/${habit.id}/checkins`, owner);
    assert.equal(checked.status, 201);
    assert.equal(checked.data.habit.plant.wilt, 'none');
    assert.equal(checked.data.habit.plant.recovering, true);
    assert.equal(checked.data.habit.plant.missedRecently, 1, 'history is kept, only appearance recovers');
  });

  test('a start date cannot be moved later than an existing check-in', async () => {
    const today = todayFor(owner);
    const habit = await makeHabit(owner, { name: 'Moved start', frequency: 'daily', startDate: addDays(today, -3) });
    await pool.execute('INSERT INTO check_ins (habit_id, check_date) VALUES (?, ?)', [habit.id, addDays(today, -2)]);

    const rejected = await call('PUT', `/api/habits/${habit.id}`, owner, {
      name: 'Moved start', frequency: 'daily', startDate: addDays(today, -1),
    });
    assert.equal(rejected.status, 400);
    assert.ok(rejected.data.fields.startDate);

    const accepted = await call('PUT', `/api/habits/${habit.id}`, owner, {
      name: 'Moved start', frequency: 'daily', startDate: addDays(today, -2),
    });
    assert.equal(accepted.status, 200);
  });

  test('the user timezone decides "today"', async () => {
    const aukland = await makeUser('auckland', 'Pacific/Auckland');
    const habit = await makeHabit(aukland, { name: 'Timezone check' });
    assert.equal(habit.today.date, todayInTimezone('Pacific/Auckland'));
  });
});

describe('ownership isolation (User A cannot touch User B)', () => {
  let ownerHabit;

  before(async () => {
    ownerHabit = await makeHabit(owner, { name: 'Owner private habit', frequency: 'daily' });
  });

  test('another user cannot read, edit, delete or check in the habit', async () => {
    const id = ownerHabit.id;
    assert.equal((await call('GET', `/api/habits/${id}`, other)).status, 404);
    assert.equal((await call('PUT', `/api/habits/${id}`, other, { name: 'Hacked', frequency: 'daily' })).status, 404);
    assert.equal((await call('DELETE', `/api/habits/${id}`, other)).status, 404);
    assert.equal((await call('POST', `/api/habits/${id}/checkins`, other)).status, 404);
    assert.equal((await call('DELETE', `/api/habits/${id}/checkins/${todayFor(other)}`, other)).status, 404);
  });

  test("another user's list never includes the habit", async () => {
    const list = await call('GET', '/api/habits', other);
    assert.ok(!list.data.habits.some((h) => h.id === ownerHabit.id));
  });

  test('the owner\'s habit is unchanged after the attempts', async () => {
    const detail = await call('GET', `/api/habits/${ownerHabit.id}`, owner);
    assert.equal(detail.status, 200);
    assert.equal(detail.data.habit.name, 'Owner private habit');
    assert.equal(await countCheckIns(ownerHabit.id), 0, 'no check-in was written by the other user');
  });

  test('a missing habit and another user\'s habit give identical responses', async () => {
    const missing = await call('GET', '/api/habits/99999999', other);
    const notOwned = await call('GET', `/api/habits/${ownerHabit.id}`, other);
    assert.equal(missing.status, notOwned.status);
    assert.deepEqual(missing.data, notOwned.data, 'responses must not reveal which case it is');
  });

  test('malformed ids are treated as not found', async () => {
    for (const bad of ['abc', '0', '-1', '1.5', '01']) {
      assert.equal((await call('GET', `/api/habits/${bad}`, owner)).status, 404, `id ${bad}`);
    }
  });
});

describe('concurrency and data integrity', () => {
  test('a concurrent double check-in never produces duplicate rows', async () => {
    const habit = await makeHabit(owner, { name: 'Double click', frequency: 'daily' });
    await Promise.all([
      call('POST', `/api/habits/${habit.id}/checkins`, owner),
      call('POST', `/api/habits/${habit.id}/checkins`, owner),
    ]);
    assert.equal(await countCheckIns(habit.id), 1);
  });
});
