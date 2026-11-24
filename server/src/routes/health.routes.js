import { Router } from 'express';
import { pool } from '../config/db.js';

const router = Router();

// GET /api/health
// Confirms the API is running AND can reach the database.
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'ok' });
  } catch (err) {
    console.error('[health] database check failed:', err.message);
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

export default router;
