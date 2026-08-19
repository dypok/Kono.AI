import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: localStorage.getItem('kono_auth') === 'true',
  user: localStorage.getItem('kono_auth') === 'true' ? {
    id: 'usr_1',
    name: 'Dylan P.',
    email: 'dylan@kono.ai',
    role: 'Lead Financial Auditor',
  } : null,

  login: async (email: string, password?: string) => {
    try {
      if (password && password !== '••••••••••••') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data?.user) {
          // Fetch extended profile data from public.profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const u: User = {
            id: data.user.id,
            name: profile?.full_name || data.user.user_metadata?.name || email.split('@')[0].toUpperCase(),
            email: data.user.email || email,
            role: profile?.role || 'Lead Financial Auditor',
            avatarUrl: profile?.avatar_url,
          };
          localStorage.setItem('kono_auth', 'true');
          set({ isAuthenticated: true, user: u });
          return true;
        }
      }
    } catch (e) {
      console.warn('Supabase online auth bypassed; using fast demo session:', e);
    }

    // Fast fallback demo session
    await new Promise((r) => setTimeout(r, 400));
    const mockUser: User = {
      id: 'usr_1',
      name: email.split('@')[0].toUpperCase(),
      email: email,
      role: 'Lead Financial Auditor',
    };
    localStorage.setItem('kono_auth', 'true');
    set({ isAuthenticated: true, user: mockUser });
    return true;
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    localStorage.removeItem('kono_auth');
    set({ isAuthenticated: false, user: null });
  },

  checkSession: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();

        const u: User = {
          id: data.session.user.id,
          name: profile?.full_name || data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0].toUpperCase() || 'User',
          email: data.session.user.email || '',
          role: profile?.role || 'Lead Financial Auditor',
          avatarUrl: profile?.avatar_url,
        };
        localStorage.setItem('kono_auth', 'true');
        set({ isAuthenticated: true, user: u });
      }
    } catch (_) {}
  },
}));
