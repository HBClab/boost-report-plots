import { plot1Query, plot2Query, plot3Query, pool } from './db.js';

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  });
}

export async function healthHandler(): Promise<Response> {
  try {
    await pool.query('SELECT 1');
    return json({ status: 'ok' });
  } catch (err) {
    return json({ status: 'error', message: String(err) }, { status: 500 });
  }
}

export async function plot1Handler(request: Request, groupFromPath?: string): Promise<Response> {
  const url = new URL(request.url);
  const raw = (groupFromPath ?? url.pathname.split('/').filter(Boolean).at(-1) ?? '').toLowerCase();
  if (raw !== 'intervention' && raw !== 'observational') {
    return json({
      error: 'Invalid group. Must be "intervention" or "observational".',
    }, { status: 400 });
  }

  let sessionNumber: number | undefined;
  const session = url.searchParams.get('session');
  if (session !== null) {
    const n = parseInt(session, 10);
    if (isNaN(n) || n < 1) {
      return json({ error: 'session must be a positive integer' }, { status: 400 });
    }
    sessionNumber = n;
  }

  try {
    const rows = await plot1Query(raw, sessionNumber);
    return json({ group: raw, rows, session: sessionNumber ?? null });
  } catch (err) {
    console.error('/api/plot1 error:', err);
    return json({ error: 'Database query failed', detail: String(err) }, { status: 500 });
  }
}

export async function plot2Handler(): Promise<Response> {
  try {
    const subjects = await plot2Query();
    return json({ group: 'intervention', subjects });
  } catch (err) {
    console.error('/api/plot2 error:', err);
    return json({ error: 'Database query failed', detail: String(err) }, { status: 500 });
  }
}

export async function plot3Handler(): Promise<Response> {
  try {
    const rows = await plot3Query();
    return json({ rows });
  } catch (err) {
    console.error('/api/plot3 error:', err);
    return json({ error: 'Database query failed', detail: String(err) }, { status: 500 });
  }
}
