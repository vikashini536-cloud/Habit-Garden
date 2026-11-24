import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { pool } from '../src/config/db.js';
import { createUser, createSession, verifyCredentials } from '../src/services/authService.js';
import { todayInTimezone } from '../src/utils/dates.js';

// Account tests use real HTTP requests and the real database. Users are created directly
// (not through /signup) so the auth rate limit is not used up by test setup.
// Each test file runs in its own process, so its rate-limit counter starts fresh.

const RUN = Date.now().toString(36);
const PASSWORD = 'Test-Password-1';
const createdUserIds = [];
let server;
let baseUrl;

async function makeUser(label) {
  const user = await createUser({
    name: label,
    email: `acct.${label}.${RUN}@test.local`,
    password: PASSWORD,
    timezone: 'UTC',
  });
  createdUserIds.push(user.id);
  const token = await createSession(user.id);
  return { ...user, token, cookie: `hg_session=${token}` };
}

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

async function addHabitWithCheckIn(user, name) {
  const [result] = await pool.execute(
    "INSERT INTO habits (user_id, name, frequency, weekdays, start_date) VALUES (?, ?, 'daily', 127, ?)",
    [user.id, name, todayInTimezone('UTC')],
  );
  await pool.execute('INSERT INTO check_ins (habit_id, check_date) VALUES (?, ?)', [result.insertId, todayInTimezone('UTC')]);
  return result.insertId;
}

async function count(sql, params) {
  const [[row]] = await pool.execute(sql, params);
  return row.n;
}

before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  for (const id of createdUserIds) {
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
  }
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

describe('change password', () => {
  test('requires a logged-in session', async () => {
    const r = await call('POST', '/api/auth/change-password', undefined, {
      currentPassword: PASSWORD, newPassword: 'Another-Pass-2',
    });
    assert.equal(r.status, 401);
  });

  test('a wrong current password is a 400 field error, not a 401 (the UI must not sign the user out)', async () => {
    const user = await makeUser('wrongcurrent');
    const r = await call('POST', '/api/auth/change-password', user, {
      currentPassword: 'Not-The-Password', newPassword: 'Another-Pass-2',
    });
    assert.equal(r.status, 400);
    assert.ok(r.data.fields.currentPassword);
    await verifyCredentials(user.email, PASSWORD); // still the old password, nothing changed
  });

  test('new password must differ from the current one and meet the length rules', async () => {
    const user = await makeUser('badnew');
    const same = await call('POST', '/api/auth/change-password', user, {
      currentPassword: PASSWORD, newPassword: PASSWORD,
    });
    assert.equal(same.status, 400);
    assert.ok(same.data.fields.newPassword);

    const short = await call('POST', '/api/auth/change-password', user, {
      currentPassword: PASSWORD, newPassword: 'short',
    });
    assert.equal(short.status, 400);
    assert.ok(short.data.fields.newPassword);
  });

  test('success changes the password, keeps this session, and signs out other devices', async () => {
    const user = await makeUser('changer');
    const otherDeviceToken = await createSession(user.id);

    const r = await call('POST', '/api/auth/change-password', user, {
      currentPassword: PASSWORD, newPassword: 'Brand-New-Pass-3',
    });
    assert.equal(r.status, 200);

    await assert.rejects(verifyCredentials(user.email, PASSWORD), 'old password must stop working');
    await verifyCredentials(user.email, 'Brand-New-Pass-3');

    assert.equal((await call('GET', '/api/auth/me', user)).status, 200, 'this session stays signed in');
    const otherCookie = { cookie: `hg_session=${otherDeviceToken}` };
    assert.equal((await call('GET', '/api/auth/me', otherCookie)).status, 401, 'the other device is signed out');
  });
});

describe('delete account', () => {
  test('a wrong password is refused and nothing is deleted', async () => {
    const user = await makeUser('wrongdelete');
    await addHabitWithCheckIn(user, 'Should survive');

    const r = await call('DELETE', '/api/auth/account', user, { password: 'Not-The-Password' });
    assert.equal(r.status, 400);
    assert.ok(r.data.fields.password);
    assert.equal(await count('SELECT COUNT(*) AS n FROM users WHERE id = ?', [user.id]), 1);
    assert.equal(await count('SELECT COUNT(*) AS n FROM habits WHERE user_id = ?', [user.id]), 1);
  });

  test('a missing password is refused', async () => {
    const user = await makeUser('nopassword');
    const r = await call('DELETE', '/api/auth/account', user, {});
    assert.equal(r.status, 400);
  });

  test('deleting removes sessions, habits and check-ins, and leaves other users untouched', async () => {
    const leaver = await makeUser('leaver');
    const keeper = await makeUser('keeper');
    const leaverHabit = await addHabitWithCheckIn(leaver, 'Gone soon');
    const keeperHabit = await addHabitWithCheckIn(keeper, 'Stays');
    const keeperSessionBefore = await count('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?', [keeper.id]);

    const r = await call('DELETE', '/api/auth/account', leaver, { password: PASSWORD });
    assert.equal(r.status, 200);

    assert.equal(await count('SELECT COUNT(*) AS n FROM users WHERE id = ?', [leaver.id]), 0);
    assert.equal(await count('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?', [leaver.id]), 0);
    assert.equal(await count('SELECT COUNT(*) AS n FROM habits WHERE id = ?', [leaverHabit]), 0);
    assert.equal(await count('SELECT COUNT(*) AS n FROM check_ins WHERE habit_id = ?', [leaverHabit]), 0);

    assert.equal(await count('SELECT COUNT(*) AS n FROM habits WHERE id = ?', [keeperHabit]), 1, 'other habits remain');
    assert.equal(await count('SELECT COUNT(*) AS n FROM check_ins WHERE habit_id = ?', [keeperHabit]), 1, 'other check-ins remain');
    assert.equal(await count('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?', [keeper.id]), keeperSessionBefore);

    assert.equal((await call('GET', '/api/auth/me', leaver)).status, 401, 'the deleted account can no longer log in');
    assert.equal((await call('GET', '/api/auth/me', keeper)).status, 200, 'the other user is unaffected');
  });
});
