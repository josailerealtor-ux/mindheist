import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getTrapWithSolution(trapId: string) {
  return supabase.from('traps').select('*').eq('id', trapId).single();
}

export function stripSolution<T extends { solution?: unknown }>(trap: T): Omit<T, 'solution'> {
  const { solution: _solution, ...rest } = trap;
  return rest;
}
