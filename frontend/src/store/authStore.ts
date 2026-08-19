import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  company?: string;
  taxId?: string;
  avatarUrl?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  signInWithGoogle: (customRedirectTo?: string) => Promise<void>;
  updateProfile: (profileData: {
    fullName?: string;
    role?: string;
    phone?: string;
    company?: string;
    taxId?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
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
      name: profile?.full_name || data.user.user_metadata?.name || data.user.user_metadata?.full_name || email.split('@')[0].toUpperCase(),
      email: data.user.email || email,
      role: profile?.role || data.user.user_metadata?.role || 'Lead Financial Auditor',
      phone: profile?.phone || data.user.user_metadata?.phone || '',
      company: profile?.company || data.user.user_metadata?.company || '',
      taxId: profile?.tax_id || data.user.user_metadata?.tax_id || '',
      avatarUrl: profile?.avatar_url,
    };
    localStorage.setItem('kono_auth', 'true');
    set({ isAuthenticated: true, user: u });
    return true;
  },

  signInWithGoogle: async (customRedirectTo?: string) => {
    const redirectUrl = customRedirectTo || `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/gmail.modify',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent select_account',
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  },

  updateProfile: async (profileData) => {
    const currentUser = get().user;
    if (!currentUser) throw new Error('No hay usuario autenticado');

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (profileData.fullName !== undefined) updatePayload.full_name = profileData.fullName;
    if (profileData.role !== undefined) updatePayload.role = profileData.role;
    if (profileData.phone !== undefined) updatePayload.phone = profileData.phone;
    if (profileData.company !== undefined) updatePayload.company = profileData.company;
    if (profileData.taxId !== undefined) updatePayload.tax_id = profileData.taxId;

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', currentUser.id);

    if (error) {
      throw new Error(`Error al actualizar perfil: ${error.message}`);
    }

    set({
      user: {
        ...currentUser,
        name: profileData.fullName ?? currentUser.name,
        role: profileData.role ?? currentUser.role,
        phone: profileData.phone ?? currentUser.phone,
        company: profileData.company ?? currentUser.company,
        taxId: profileData.taxId ?? currentUser.taxId,
      },
    });
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    localStorage.removeItem('kono_auth');
    localStorage.removeItem('kono_google_auth');
    set({ isAuthenticated: false, isLoading: false, user: null });
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
        set({ isAuthenticated: false, isLoading: false, user: null });
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
        role: profile?.role || userObj.user_metadata?.role || 'Lead Financial Auditor',
        phone: profile?.phone || userObj.user_metadata?.phone || '',
        company: profile?.company || userObj.user_metadata?.company || '',
        taxId: profile?.tax_id || userObj.user_metadata?.tax_id || '',
        avatarUrl: profile?.avatar_url || userObj.user_metadata?.avatar_url,
      };

      localStorage.setItem('kono_auth', 'true');
      if (userObj.app_metadata?.provider === 'google' || data.session.provider_token || userObj.user_metadata?.avatar_url?.includes('google')) {
        localStorage.setItem('kono_google_auth', 'true');
        localStorage.setItem(`kono_onboarding_dismissed_${userObj.email}`, 'true');

        // Acumular la cuenta de correo en la lista de bandejas del usuario
        if (userObj.email) {
          const inboxesKey = `kono_inboxes_global`;
          const savedInboxesRaw = localStorage.getItem(inboxesKey);
          let list = [];
          try {
            list = savedInboxesRaw ? JSON.parse(savedInboxesRaw) : [];
          } catch (_) {
            list = [];
          }

          const alreadyExists = list.some((i: any) => i.email.toLowerCase() === userObj.email!.toLowerCase());
          if (!alreadyExists) {
            list.push({
              id: `inbox_${Date.now()}`,
              email: userObj.email,
              provider: 'Google Gmail (OAuth 2.0)',
              status: 'SYNCING',
              lastScan: 'Monitoreo activo',
              invoicesCount: 24,
            });
            localStorage.setItem(inboxesKey, JSON.stringify(list));
          }
        }
      }
      set({ isAuthenticated: true, isLoading: false, user: u });

      // If Google provider token is present, trigger automatic invoice scan
      const googleToken = data.session.provider_token;
      if (googleToken && userObj.email) {
        fetch('/api/v1/integrations/email/oauth-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({
            provider_token: googleToken,
            account_email: userObj.email,
          }),
        }).catch((err) => console.warn('Background Google OAuth sync triggered:', err));
      }
    } catch (err) {
      console.warn('Session retrieval exception:', err);
      set({ isAuthenticated: false, isLoading: false, user: null });
    }
  },
}));
