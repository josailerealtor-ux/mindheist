export interface TrapScoreInput {
  attempt_count: number;
  escape_count: number;
  like_count: number;
  published_at: string; // ISO timestamp
}

// Weights must sum to 1
const W_ESCAPE_RATE = 0.40;
const W_RECENCY     = 0.35;
const W_LIKES       = 0.25;

// Half-life for recency decay: 7 days
const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Wilson score lower bound for escape rate.
 * Gives a conservative estimate of the true escape rate
 * even with few attempts (avoids inflating new traps with 1/1 escape rate).
 */
export function wilsonEscapeRate(escapes: number, attempts: number): number {
  if (attempts === 0) return 0;
  const z = 1.645; // 95% confidence
  const phat = escapes / attempts;
  const denom = 1 + (z * z) / attempts;
  const centre = phat + (z * z) / (2 * attempts);
  const spread = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * attempts)) / attempts);
  return (centre - spread) / denom;
}

/**
 * Exponential recency decay: 1.0 when just published, halves every HALF_LIFE_MS.
 */
export function recencyScore(publishedAt: string, nowMs = Date.now()): number {
  const ageMs = nowMs - new Date(publishedAt).getTime();
  if (ageMs <= 0) return 1;
  return Math.pow(0.5, ageMs / HALF_LIFE_MS);
}

/**
 * Normalised like score: log scale so viral traps don't dominate.
 * Returns value in [0, 1] asymptotically.
 */
export function likeScore(likeCount: number): number {
  return Math.log1p(likeCount) / Math.log1p(1000); // saturates at ~1000 likes
}

export function trendingScore(trap: TrapScoreInput, nowMs = Date.now()): number {
  const er = wilsonEscapeRate(trap.escape_count, trap.attempt_count);
  const r  = recencyScore(trap.published_at, nowMs);
  const l  = likeScore(trap.like_count);
  return W_ESCAPE_RATE * er + W_RECENCY * r + W_LIKES * l;
}
