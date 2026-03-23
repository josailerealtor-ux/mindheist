import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error('SUPABASE_URL env var is not set');
if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var is not set');

export const supabase = createClient(url, key);

export async function getTrapWithSolution(trapId: string) {
  return supabase.from('traps').select('*').eq('id', trapId).single();
}

export function stripSolution<T extends { solution?: unknown }>(trap: T): Omit<T, 'solution'> {
  const { solution: _solution, ...rest } = trap;
  return rest;
}
