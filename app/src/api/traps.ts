import { apiFetch } from './client';
import { Trap, TrapDifficulty, TrapStep } from '../types/trap';
import { TrapSolution } from '../types/engine';

export interface CreateTrapPayload {
  title: string;
  description?: string;
  difficulty?: TrapDifficulty;
  steps?: TrapStep[];
  solution?: TrapSolution;
}

export interface UpdateTrapPayload {
  title?: string;
  description?: string;
  difficulty?: TrapDifficulty;
  steps?: TrapStep[];
  solution?: TrapSolution;
}

export interface PublishResult {
  trap: Trap;
}

export const trapsApi = {
  create: (payload: CreateTrapPayload) =>
    apiFetch<Trap>('/api/traps', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateTrapPayload) =>
    apiFetch<Trap>(`/api/traps/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  publish: (id: string) =>
    apiFetch<Trap>(`/api/traps/${id}/publish`, { method: 'POST' }),

  get: (id: string) =>
    apiFetch<Trap>(`/api/traps/${id}`),

  stats: (id: string) =>
    apiFetch<{ attempt_count: number; escape_count: number; like_count: number }>(
      `/api/traps/${id}/stats`
    ),
};
