import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { Profile } from '../types';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;

  signUpWithPassword: (name: string, phone: string, password: string, role: Profile['role']) => Promise<{ error: string | null }>;
  signInWithPassword: (phone: string, password: string) => Promise<{ error: string | null }>;

  signOut: () => Promise<void>;
  refreshCredits: () => Promise<void>;
}

function toEmail(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@loop.app`;
}

function toE164(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('91') ? `+${digits}` : `+91${digits}`;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) set({ profile: data as Profile });
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { session } = get();
    if (!session) return;
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .select()
      .single();
    if (!error && data) set({ profile: data as Profile });
  },

  signUpWithPassword: async (name, phone, password, role) => {
    const e164 = toE164(phone);
    const email = toEmail(phone);

    // Check if phone already registered
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', e164)
      .maybeSingle();

    if (existing) {
      return { error: 'This phone number is already registered. Please sign in.' };
    }

    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      set({ loading: false });
      return { error: error?.message ?? 'Sign up failed. Please try again.' };
    }

    // Update the auto-created profile with real details
    await supabase
      .from('profiles')
      .update({ name, phone: e164, role, updated_at: new Date().toISOString() })
      .eq('id', data.user.id);

    // Fetch updated profile into store
    await get().fetchProfile(data.user.id);
    set({ loading: false });
    return { error: null };
  },

  signInWithPassword: async (phone, password) => {
    const email = toEmail(phone);
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) {
      return { error: 'Incorrect phone number or password.' };
    }
    return { error: null };
  },

  refreshCredits: async () => {
    const { session } = get();
    if (!session) return;
    const { data } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', session.user.id)
      .single();
    if (data) {
      set((state) => ({
        profile: state.profile ? { ...state.profile, credits: data.credits } : null,
      }));
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
