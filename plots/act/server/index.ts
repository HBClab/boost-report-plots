import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, plot1Query, plot2Query } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 3000;

// Serve static files from public/
const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));

// ---------------------------------------------------------------------------
// GET /health — DB connectivity check
// ---------------------------------------------------------------------------
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/plot1/:group
// ---------------------------------------------------------------------------
app.get('/api/plot1/:group', async (req, res) => {
  const raw = req.params.group.toLowerCase();
  if (raw !== 'intervention' && raw !== 'observational') {
    res.status(400).json({
      error: 'Invalid group. Must be "intervention" or "observational".',
    });
    return;
  }
  const group = raw as 'intervention' | 'observational';
  try {
    const rows = await plot1Query(group);
    res.json({ group, rows });
  } catch (err) {
    console.error('/api/plot1 error:', err);
    res.status(500).json({ error: 'Database query failed', detail: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/plot2
// ---------------------------------------------------------------------------
app.get('/api/plot2', async (_req, res) => {
  try {
    const subjects = await plot2Query();
    res.json({ group: 'intervention', subjects });
  } catch (err) {
    console.error('/api/plot2 error:', err);
    res.status(500).json({ error: 'Database query failed', detail: String(err) });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  const dbUrl = process.env.ACTIGRAPHY_DB_URL ?? '(not set)';
  // Log without credentials — strip userinfo from URL if present
  const safeUrl = dbUrl.replace(/\/\/[^@]+@/, '//***@');
  console.log(`act-plots server listening on http://localhost:${PORT}`);
  console.log(`Database: ${safeUrl}`);
});
