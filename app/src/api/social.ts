import { apiFetch } from './client';
import { Trap } from '../types/trap';

export interface FeedTrap extends Trap {
  creator: { username: string; avatar_url: string | null };
  liked_by_me: boolean;
}

export interface Comment {
  id: string;
  trap_id: string;
  user_id: string;
  body: string;
  created_at: string;
  user: { username: string; avatar_url: string | null };
}

export interface Challenge {
  id: string;
  challenger_id: string;
  target_id: string;
  trap_id: string;
  status: 'pending' | 'accepted' | 'resolved';
  created_at: string;
  challenger: { username: string };
  target: { username: string };
  trap: { title: string; difficulty: string };
}

export const socialApi = {
  feed: (cursor?: string) => {
    const params = cursor ? `?cursor=${cursor}` : '';
    return apiFetch<{ traps: FeedTrap[]; nextCursor: string | null }>(`/api/feed${params}`);
  },

  toggleLike: (trapId: string) =>
    apiFetch<{ liked: boolean; like_count: number }>(`/api/traps/${trapId}/like`, { method: 'POST' }),

  getComments: (trapId: string) =>
    apiFetch<Comment[]>(`/api/traps/${trapId}/comments`),

  postComment: (trapId: string, body: string) =>
    apiFetch<Comment>(`/api/traps/${trapId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  sendChallenge: (targetId: string, trapId: string) =>
    apiFetch<Challenge>('/api/challenges', {
      method: 'POST',
      body: JSON.stringify({ target_id: targetId, trap_id: trapId }),
    }),

  getChallenges: () =>
    apiFetch<Challenge[]>('/api/challenges'),

  respondToChallenge: (challengeId: string, action: 'accept' | 'decline') =>
    apiFetch<Challenge>(`/api/challenges/${challengeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    }),
};
