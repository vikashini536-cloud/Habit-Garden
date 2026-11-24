import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { addDays } from '../utils/dates.js';
import { isScheduled, maskToWeekdays } from '../utils/schedule.js';
import { validateHabit } from '../validation/habitValidation.js';
import { computePlantState } from './plantState.js';

// Every query in this file includes "user_id = ?" (or joins to habits.user_id).
// A habit that belongs to someone else is reported exactly like a habit that does not exist,
// so the API never reveals that another user's habit exists.
const notFound = () => new AppError(404, 'Habit not found.');
const validationError = (fields) => new AppError(400, 'Please fix the highlighted fields.', fields);

const HISTORY_DAYS = 90;

const HABIT_COLUMNS = 'id, name, description, category, frequency, weekdays, start_date';

// The shape the frontend receives for a habit. Snake_case in the database, camelCase in the API.
function toHabitDto(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    frequency: row.frequency,
    weekdays: maskToWeekdays(row.weekdays),
    startDate: row.start_date,
  };
}

// Combines a habit with its check-in history and calculated plant state.
function buildHabitView(row, checkInDates, today) {
  const plant = computePlantState({
    startDate: row.start_date,
    weekdays: row.weekdays,
    checkInDates,
    today,
  });
  return {
    ...toHabitDto(row),
    today: { date: today, scheduled: plant.scheduledToday, checkedIn: plant.checkedInToday },
    plant,
  };
}

async function findOwnedHabit(userId, habitId) {
  const [rows] = await pool.execute(
    `SELECT ${HABIT_COLUMNS} FROM habits WHERE id = ? AND user_id = ?`,
    [habitId, userId],
  );
  if (!rows[0]) throw notFound();
  return rows[0];
}

async function loadCheckInDates(habitId) {
  const [rows] = await pool.execute('SELECT check_date FROM check_ins WHERE habit_id = ?', [habitId]);
  return new Set(rows.map((row) => row.check_date));
}

// Dates from the last HISTORY_DAYS days, oldest first. Used for the habit detail calendar.
function recentDates(checkInDates, today) {
  const from = addDays(today, -(HISTORY_DAYS - 1));
  return [...checkInDates].filter((d) => d >= from && d <= today).sort();
}

export async function listHabits(userId, today) {
  const [habitRows] = await pool.execute(
    `SELECT ${HABIT_COLUMNS} FROM habits WHERE user_id = ? ORDER BY created_at, id`,
    [userId],
  );
  // One query for all check-ins, instead of one query per habit.
  const [checkRows] = await pool.execute(
    `SELECT c.habit_id, c.check_date
       FROM check_ins c
       JOIN habits h ON h.id = c.habit_id
      WHERE h.user_id = ?`,
    [userId],
  );

  const datesByHabit = new Map();
  for (const row of checkRows) {
    if (!datesByHabit.has(row.habit_id)) datesByHabit.set(row.habit_id, new Set());
    datesByHabit.get(row.habit_id).add(row.check_date);
  }

  return habitRows.map((row) => buildHabitView(row, datesByHabit.get(row.id) ?? new Set(), today));
}

export async function getHabit(userId, habitId, today) {
  const row = await findOwnedHabit(userId, habitId);
  const checkInDates = await loadCheckInDates(row.id);
  return {
    habit: buildHabitView(row, checkInDates, today),
    checkInDates: recentDates(checkInDates, today),
  };
}

export async function createHabit(userId, body, today) {
  const { errors, values } = validateHabit(body, today);
  if (Object.keys(errors).length > 0) throw validationError(errors);

  const [result] = await pool.execute(
    `INSERT INTO habits (user_id, name, description, category, frequency, weekdays, start_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, values.name, values.description, values.category, values.frequency, values.weekdays, values.startDate ?? today],
  );

  const { habit } = await getHabit(userId, result.insertId, today);
  return habit;
}

// PUT replaces the habit's editable fields. Omitted optional fields become empty.
// startDate is optional here. If it is omitted, the existing start date is kept.
export async function updateHabit(userId, habitId, body, today) {
  const existing = await findOwnedHabit(userId, habitId);

  const { errors, values } = validateHabit(body, today);
  if (Object.keys(errors).length > 0) throw validationError(errors);

  const startDate = values.startDate ?? existing.start_date;

  // A start date cannot be moved later than an existing check-in. Otherwise that check-in
  // would sit before the habit started, which makes no sense.
  const [[firstRow]] = await pool.execute(
    'SELECT MIN(check_date) AS first_date FROM check_ins WHERE habit_id = ?',
    [habitId],
  );
  const firstDate = firstRow.first_date;
  if (firstDate && startDate > firstDate) {
    throw validationError({
      startDate: `Start date cannot be after your first check-in (${firstDate}).`,
    });
  }

  await pool.execute(
    `UPDATE habits
        SET name = ?, description = ?, category = ?, frequency = ?, weekdays = ?, start_date = ?
      WHERE id = ? AND user_id = ?`,
    [values.name, values.description, values.category, values.frequency, values.weekdays, startDate, habitId, userId],
  );

  const { habit } = await getHabit(userId, habitId, today);
  return habit;
}

export async function deleteHabit(userId, habitId) {
  // Check-ins are removed automatically by the database (ON DELETE CASCADE).
  const [result] = await pool.execute('DELETE FROM habits WHERE id = ? AND user_id = ?', [habitId, userId]);
  if (result.affectedRows === 0) throw notFound();
}

// Marks today's check-in. Only today can be checked in, and only on a scheduled day.
export async function checkInToday(userId, habitId, today) {
  const habit = await findOwnedHabit(userId, habitId);

  if (habit.start_date > today || !isScheduled(habit.weekdays, today)) {
    throw new AppError(400, 'This habit is not scheduled for today.');
  }

  // We do not check "does a row exist?" first. Two requests could both see "no row" and both insert.
  // Instead, the UNIQUE key on (habit_id, check_date) makes the database accept only one.
  let created = true;
  try {
    await pool.execute('INSERT INTO check_ins (habit_id, check_date) VALUES (?, ?)', [habit.id, today]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      created = false;
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      // The habit was deleted a moment ago, between our check and the insert.
      throw notFound();
    } else {
      throw err;
    }
  }

  const checkInDates = await loadCheckInDates(habit.id);
  return { created, habit: buildHabitView(habit, checkInDates, today) };
}

// Removes today's check-in. Past check-ins cannot be changed, which keeps history honest.
export async function undoCheckInToday(userId, habitId, date, today) {
  if (date !== today) {
    throw new AppError(400, "Only today's check-in can be undone.");
  }
  const habit = await findOwnedHabit(userId, habitId);

  const [result] = await pool.execute(
    'DELETE FROM check_ins WHERE habit_id = ? AND check_date = ?',
    [habit.id, today],
  );

  const checkInDates = await loadCheckInDates(habit.id);
  return { removed: result.affectedRows > 0, habit: buildHabitView(habit, checkInDates, today) };
}
