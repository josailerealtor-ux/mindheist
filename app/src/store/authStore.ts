import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types/user';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, username: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, loading: false });

    if (session) {
      await fetchProfile(session.user.id, set);
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session });
      if (session) {
        await fetchProfile(session.user.id, set);
      } else {
        set({ user: null });
      }
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    return error?.message ?? null;
  },

  signUp: async (email, password, username) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ loading: false });
      return error.message;
    }
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({ id: data.user.id, username });
      if (profileError) {
        set({ loading: false });
        return profileError.message;
      }
    }
    set({ loading: false });
    return null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));

async function fetchProfile(userId: string, set: (partial: Partial<AuthState>) => void) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (data) set({ user: data as User });
}
