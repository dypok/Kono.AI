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
  signInWithGoogle: () => Promise<void>;
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
    if (!password) {
      throw new Error('Debes ingresar tu contraseña.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      throw new Error(error?.message || 'Credenciales incorrectas en Supabase.');
    }

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
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/gmail.modify',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }
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
          avatarUrl: profile?.avatar_url || data.session.user.user_metadata?.avatar_url,
        };
        localStorage.setItem('kono_auth', 'true');
        set({ isAuthenticated: true, user: u });

        // If Google provider token is present, trigger automatic invoice scan
        const googleToken = data.session.provider_token;
        if (googleToken) {
          fetch('/api/v1/integrations/email/oauth-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({
              provider_token: googleToken,
              account_email: u.email,
            }),
          }).catch((err) => console.warn('Background Google OAuth sync triggered:', err));
        }
      }
    } catch (_) {}
  },
}));
