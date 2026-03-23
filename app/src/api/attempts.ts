import { apiFetch } from './client';
import { Attempt } from '../types/attempt';
import { StepAnswer } from '../types/engine';

export interface SubmitStepResponse {
  correct: boolean;
  hint?: string;
  attempt: Attempt;
}

export const attemptsApi = {
  start: (trapId: string) =>
    apiFetch<Attempt>(`/api/traps/${trapId}/attempts`, { method: 'POST' }),

  get: (attemptId: string) =>
    apiFetch<Attempt>(`/api/attempts/${attemptId}`),

  submitStep: (attemptId: string, answer: StepAnswer) =>
    apiFetch<SubmitStepResponse>(`/api/attempts/${attemptId}/step`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    }),

  abandon: (attemptId: string) =>
    apiFetch<void>(`/api/attempts/${attemptId}/abandon`, { method: 'POST' }),
};
