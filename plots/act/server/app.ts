import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, plot1Query, plot2Query, plot3Query } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');
const hrCsvCandidates = [
  path.resolve(__dirname, '..', 'public', 'data', 'zone_out.csv'),
  path.resolve(__dirname, '..', '..', 'data', 'zone_out.csv'),
  path.resolve(__dirname, '..', '..', '..', '..', 'data', 'zone_out.csv'),
  path.resolve(process.cwd(), 'public', 'data', 'zone_out.csv'),
  path.resolve(process.cwd(), '..', '..', 'data', 'zone_out.csv'),
].filter((candidate, index, all) => all.indexOf(candidate) === index);

function resolveHrCsvPath(): string | null {
  return hrCsvCandidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

const app = express();

// Local dev uses Express static serving. On Vercel, static assets come from public/**.
if (!process.env.VERCEL) {
  app.use(express.static(publicDir));
}

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

app.get('/api/plot1/:group', async (req, res) => {
  const raw = req.params.group.toLowerCase();
  if (raw !== 'intervention' && raw !== 'observational') {
    res.status(400).json({
      error: 'Invalid group. Must be "intervention" or "observational".',
    });
    return;
  }
  const group = raw as 'intervention' | 'observational';

  let sessionNumber: number | undefined;
  if (req.query.session !== undefined) {
    const n = parseInt(req.query.session as string, 10);
    if (isNaN(n) || n < 1) {
      res.status(400).json({ error: 'session must be a positive integer' });
      return;
    }
    sessionNumber = n;
  }

  try {
    const rows = await plot1Query(group, sessionNumber);
    res.json({ group, rows, session: sessionNumber ?? null });
  } catch (err) {
    console.error('/api/plot1 error:', err);
    res.status(500).json({ error: 'Database query failed', detail: String(err) });
  }
});

app.get('/api/plot2', async (_req, res) => {
  try {
    const subjects = await plot2Query();
    res.json({ group: 'intervention', subjects });
  } catch (err) {
    console.error('/api/plot2 error:', err);
    res.status(500).json({ error: 'Database query failed', detail: String(err) });
  }
});

app.get('/api/plot3', async (_req, res) => {
  try {
    const rows = await plot3Query();
    res.json({ rows });
  } catch (err) {
    console.error('/api/plot3 error:', err);
    res.status(500).json({ error: 'Database query failed', detail: String(err) });
  }
});

app.get('/data/zone_out.csv', (_req, res) => {
  const csvPath = resolveHrCsvPath();
  if (!csvPath) {
    res.status(404).json({ error: 'HR CSV file not found', candidates: hrCsvCandidates });
    return;
  }

  res.type('text/csv');
  res.sendFile(csvPath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'HR CSV file not found', path: csvPath });
    }
  });
});

app.get('/', (_req, res) => {
  res.redirect('/index.html');
});

app.get('*', (_req, res) => {
  res.redirect('/index.html');
});

export default app;
