import { plot1Handler } from '../../server/vercel-handlers.js';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  return plot1Handler(request);
}
