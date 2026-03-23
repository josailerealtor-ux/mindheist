import { create } from 'zustand';
import { FeedTrap, socialApi } from '../api/social';
import { track } from '../lib/analytics';

interface FeedState {
  traps: FeedTrap[];
  nextCursor: string | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  toggleLike: (trapId: string) => Promise<void>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  traps: [],
  nextCursor: null,
  loading: false,
  refreshing: false,
  error: null,

  load: async () => {
    if (get().traps.length > 0) return; // already loaded
    set({ loading: true, error: null });
    try {
      const { traps, nextCursor } = await socialApi.feed();
      set({ traps, nextCursor });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  refresh: async () => {
    set({ refreshing: true, error: null });
    try {
      const { traps, nextCursor } = await socialApi.feed();
      set({ traps, nextCursor });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ refreshing: false });
    }
  },

  loadMore: async () => {
    const { nextCursor, loading, traps } = get();
    if (!nextCursor || loading) return;
    set({ loading: true });
    try {
      const { traps: more, nextCursor: newCursor } = await socialApi.feed(nextCursor);
      set({ traps: [...traps, ...more], nextCursor: newCursor });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  toggleLike: async (trapId) => {
    // Optimistic update
    set((s) => ({
      traps: s.traps.map((t) =>
        t.id !== trapId ? t : {
          ...t,
          liked_by_me: !t.liked_by_me,
          like_count: t.liked_by_me ? t.like_count - 1 : t.like_count + 1,
        }
      ),
    }));

    try {
      track('like_toggled', { trap_id: trapId });
      const { liked, like_count } = await socialApi.toggleLike(trapId);
      // Reconcile with server truth
      set((s) => ({
        traps: s.traps.map((t) =>
          t.id !== trapId ? t : { ...t, liked_by_me: liked, like_count }
        ),
      }));
    } catch {
      // Revert optimistic update on failure
      set((s) => ({
        traps: s.traps.map((t) =>
          t.id !== trapId ? t : {
            ...t,
            liked_by_me: !t.liked_by_me,
            like_count: t.liked_by_me ? t.like_count + 1 : t.like_count - 1,
          }
        ),
      }));
    }
  },
}));
