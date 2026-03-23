import { wilsonEscapeRate, recencyScore, likeScore, trendingScore } from '../../shared/trending';

const NOW = new Date('2026-03-22T12:00:00Z').getTime();

describe('wilsonEscapeRate', () => {
  it('returns 0 for zero attempts', () => {
    expect(wilsonEscapeRate(0, 0)).toBe(0);
  });

  it('is conservative with few attempts (1/1 < 1.0)', () => {
    expect(wilsonEscapeRate(1, 1)).toBeLessThan(1);
  });

  it('returns higher value with more evidence (10/10 > 1/1)', () => {
    expect(wilsonEscapeRate(10, 10)).toBeGreaterThan(wilsonEscapeRate(1, 1));
  });

  it('is lower for 50% rate than 100% rate with same n', () => {
    expect(wilsonEscapeRate(5, 10)).toBeLessThan(wilsonEscapeRate(10, 10));
  });

  it('returns 0 for 0 escapes', () => {
    expect(wilsonEscapeRate(0, 10)).toBe(0);
  });

  it('stays in [0, 1] range', () => {
    const v = wilsonEscapeRate(50, 100);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });
});

describe('recencyScore', () => {
  it('returns 1 for just-published', () => {
    expect(recencyScore(new Date(NOW).toISOString(), NOW)).toBeCloseTo(1);
  });

  it('returns ~0.5 after one half-life (7 days)', () => {
    const sevenDaysAgo = new Date(NOW - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(recencyScore(sevenDaysAgo, NOW)).toBeCloseTo(0.5, 2);
  });

  it('is lower for older traps', () => {
    const old = new Date(NOW - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recent = new Date(NOW - 1 * 24 * 60 * 60 * 1000).toISOString();
    expect(recencyScore(old, NOW)).toBeLessThan(recencyScore(recent, NOW));
  });

  it('returns 1 for future published_at', () => {
    const future = new Date(NOW + 1000).toISOString();
    expect(recencyScore(future, NOW)).toBe(1);
  });
});

describe('likeScore', () => {
  it('returns 0 for 0 likes', () => {
    expect(likeScore(0)).toBe(0);
  });

  it('is monotonically increasing', () => {
    expect(likeScore(10)).toBeGreaterThan(likeScore(1));
    expect(likeScore(100)).toBeGreaterThan(likeScore(10));
    expect(likeScore(1000)).toBeGreaterThan(likeScore(100));
  });

  it('stays below 1 for reasonable like counts', () => {
    expect(likeScore(999)).toBeLessThan(1);
  });

  it('approaches 1 at saturation point (1000)', () => {
    expect(likeScore(1000)).toBeCloseTo(1, 5);
  });
});

describe('trendingScore', () => {
  const recentDate = new Date(NOW - 60 * 60 * 1000).toISOString(); // 1 hour ago

  it('returns a value in [0, 1]', () => {
    const score = trendingScore({ attempt_count: 10, escape_count: 5, like_count: 20, published_at: recentDate }, NOW);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('scores a new popular trap higher than an old unpopular one', () => {
    const oldDate = new Date(NOW - 60 * 24 * 60 * 60 * 1000).toISOString();
    const popular = trendingScore({ attempt_count: 100, escape_count: 80, like_count: 200, published_at: recentDate }, NOW);
    const stale   = trendingScore({ attempt_count: 1, escape_count: 0, like_count: 0, published_at: oldDate }, NOW);
    expect(popular).toBeGreaterThan(stale);
  });

  it('scores zero-attempt trap lower than attempted trap', () => {
    const noAttempts = trendingScore({ attempt_count: 0, escape_count: 0, like_count: 0, published_at: recentDate }, NOW);
    const attempted  = trendingScore({ attempt_count: 10, escape_count: 8, like_count: 5, published_at: recentDate }, NOW);
    expect(attempted).toBeGreaterThan(noAttempts);
  });
});
