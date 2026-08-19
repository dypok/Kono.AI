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
  isAuthenticated: false,
  user: null,

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
        redirectTo: window.location.origin,
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
      // 1. If auth code is in URL query (PKCE flow), exchange it
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        // Clean URL search params
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // 2. Retrieve session from Supabase Client
      const { data, error } = await supabase.auth.getSession();
      if (error || !data?.session?.user) {
        return;
      }

      const userObj = data.session.user;

      // Fetch profile data from public.profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userObj.id)
        .single();

      const u: User = {
        id: userObj.id,
        name: profile?.full_name || userObj.user_metadata?.full_name || userObj.user_metadata?.name || userObj.email?.split('@')[0].toUpperCase() || 'User',
        email: userObj.email || '',
        role: profile?.role || 'Lead Financial Auditor',
        avatarUrl: profile?.avatar_url || userObj.user_metadata?.avatar_url,
      };

      localStorage.setItem('kono_auth', 'true');
      if (userObj.app_metadata?.provider === 'google' || data.session.provider_token || userObj.user_metadata?.avatar_url?.includes('google')) {
        localStorage.setItem('kono_google_auth', 'true');
        localStorage.setItem(`kono_onboarding_dismissed_${userObj.email}`, 'true');
      }
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
    } catch (err) {
      console.warn('Session retrieval exception:', err);
    }
  },
}));
