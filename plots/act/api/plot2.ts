import { plot2Handler } from '../server/vercel-handlers.js';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return plot2Handler();
}
