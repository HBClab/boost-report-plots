import { healthHandler } from '../server/vercel-handlers.js';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return healthHandler();
}
