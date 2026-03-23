import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../services/trapService';

const router = Router();

// GET /api/analytics/creator — stats for all traps owned by the authenticated user
router.get('/creator', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  // Fetch creator's traps with counters
  const { data: traps, error: trapsError } = await supabase
    .from('traps')
    .select('id, title, difficulty, attempt_count, escape_count, like_count, published_at, status')
    .eq('creator_id', userId)
    .order('published_at', { ascending: false });

  if (trapsError) {
    res.status(500).json({ error: trapsError.message });
    return;
  }

  const trapIds = (traps ?? []).map((t) => t.id);

  if (trapIds.length === 0) {
    res.json({ traps: [], stepFailStats: [], totalEscapes: 0, totalAttempts: 0, totalLikes: 0, totalTips: 0 });
    return;
  }

  // Step-level fail stats from analytics_events
  const { data: failEvents } = await supabase
    .from('analytics_events')
    .select('properties')
    .eq('event', 'step_fail')
    .in('properties->>trap_id', trapIds);

  // Aggregate fail counts per trap+step
  const stepFailMap: Record<string, Record<number, number>> = {};
  for (const e of failEvents ?? []) {
    const trapId = e.properties?.trap_id as string;
    const step = e.properties?.step as number;
    if (!trapId || step === undefined) continue;
    if (!stepFailMap[trapId]) stepFailMap[trapId] = {};
    stepFailMap[trapId][step] = (stepFailMap[trapId][step] ?? 0) + 1;
  }

  // Tip totals per trap
  const { data: tips } = await supabase
    .from('tips')
    .select('trap_id, amount_cents')
    .in('trap_id', trapIds);

  const tipsByTrap: Record<string, number> = {};
  let totalTips = 0;
  for (const t of tips ?? []) {
    tipsByTrap[t.trap_id] = (tipsByTrap[t.trap_id] ?? 0) + t.amount_cents;
    totalTips += t.amount_cents;
  }

  // Aggregate totals
  const totals = (traps ?? []).reduce(
    (acc, t) => ({
      totalEscapes: acc.totalEscapes + t.escape_count,
      totalAttempts: acc.totalAttempts + t.attempt_count,
      totalLikes: acc.totalLikes + t.like_count,
    }),
    { totalEscapes: 0, totalAttempts: 0, totalLikes: 0 }
  );

  const enriched = (traps ?? []).map((t) => ({
    ...t,
    escape_rate: t.attempt_count > 0 ? t.escape_count / t.attempt_count : 0,
    step_fails: stepFailMap[t.id] ?? {},
    tip_total_cents: tipsByTrap[t.id] ?? 0,
  }));

  res.json({ traps: enriched, ...totals, totalTips });
});

// GET /api/analytics/creator/recent — recent activity feed
router.get('/creator/recent', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

  const { data: traps } = await supabase
    .from('traps')
    .select('id')
    .eq('creator_id', userId);

  const trapIds = (traps ?? []).map((t) => t.id);
  if (trapIds.length === 0) {
    res.json([]);
    return;
  }

  // Recent attempts on creator's traps
  const { data: attempts } = await supabase
    .from('attempts')
    .select('id, trap_id, player_id, status, started_at, completed_at, fail_count, traps(title), users!attempts_player_id_fkey(username)')
    .in('trap_id', trapIds)
    .order('started_at', { ascending: false })
    .limit(limit);

  res.json(attempts ?? []);
});

export default router;
