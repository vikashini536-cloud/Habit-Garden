import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { AppError } from '../utils/AppError.js';
import { todayInTimezone } from '../utils/dates.js';
import {
  listHabits,
  getHabit,
  createHabit,
  updateHabit,
  deleteHabit,
  checkInToday,
  undoCheckInToday,
} from '../services/habitService.js';

const router = Router();

// Every habit route requires a logged-in user. Nothing below this line is reachable anonymously.
router.use(requireAuth);

// Accepts only plain positive whole numbers. Anything else is treated as "not found".
function parseHabitId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0 || String(id) !== raw) {
    throw new AppError(404, 'Habit not found.');
  }
  return id;
}

// "Today" is computed from the user's stored timezone, never from the browser.
const todayFor = (req) => todayInTimezone(req.user.timezone);

router.get('/', async (req, res) => {
  res.json({ habits: await listHabits(req.user.id, todayFor(req)) });
});

router.post('/', async (req, res) => {
  const habit = await createHabit(req.user.id, req.body ?? {}, todayFor(req));
  res.status(201).json({ habit });
});

router.get('/:habitId', async (req, res) => {
  res.json(await getHabit(req.user.id, parseHabitId(req.params.habitId), todayFor(req)));
});

router.put('/:habitId', async (req, res) => {
  const habit = await updateHabit(req.user.id, parseHabitId(req.params.habitId), req.body ?? {}, todayFor(req));
  res.json({ habit });
});

router.delete('/:habitId', async (req, res) => {
  await deleteHabit(req.user.id, parseHabitId(req.params.habitId));
  res.json({ ok: true });
});

// 201 the first time, 200 if today was already checked in (safe to retry on a double-click).
router.post('/:habitId/checkins', async (req, res) => {
  const result = await checkInToday(req.user.id, parseHabitId(req.params.habitId), todayFor(req));
  res.status(result.created ? 201 : 200).json(result);
});

router.delete('/:habitId/checkins/:date', async (req, res) => {
  const result = await undoCheckInToday(
    req.user.id,
    parseHabitId(req.params.habitId),
    req.params.date,
    todayFor(req),
  );
  res.json(result);
});

export default router;
