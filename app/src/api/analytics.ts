import { apiFetch } from './client';

export interface TrapAnalytics {
  id: string;
  title: string;
  difficulty: string;
  attempt_count: number;
  escape_count: number;
  like_count: number;
  escape_rate: number;
  step_fails: Record<number, number>;
  tip_total_cents: number;
  published_at: string | null;
  status: string;
}

export interface CreatorStats {
  traps: TrapAnalytics[];
  totalEscapes: number;
  totalAttempts: number;
  totalLikes: number;
  totalTips: number;
}

export interface RecentActivity {
  id: string;
  trap_id: string;
  player_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  fail_count: number;
  traps: { title: string };
  users: { username: string };
}

export const analyticsApi = {
  getCreatorStats: () => apiFetch<CreatorStats>('/analytics/creator'),
  getRecentActivity: (limit = 20) =>
    apiFetch<RecentActivity[]>(`/analytics/creator/recent?limit=${limit}`),
};
