import { apiFetch } from './client';
import { AttemptEvent } from '../types/attempt';

export interface Replay {
  id: string;
  attempt_id: string;
  trap_id: string;
  player_id: string;
  is_public: boolean;
  view_count: number;
  events: AttemptEvent[];
  created_at: string;
  player?: { username: string; avatar_url: string | null };
  trap?: { title: string; difficulty: string };
}

export const replaysApi = {
  get: (attemptId: string) =>
    apiFetch<Replay>(`/api/attempts/${attemptId}/replay`),

  setPublic: (replayId: string, isPublic: boolean) =>
    apiFetch<Replay>(`/api/replays/${replayId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_public: isPublic }),
    }),

  listForTrap: (trapId: string, cursor?: string) => {
    const params = cursor ? `?cursor=${cursor}` : '';
    return apiFetch<{ replays: Replay[]; nextCursor: string | null }>(
      `/api/traps/${trapId}/replays${params}`
    );
  },
};
