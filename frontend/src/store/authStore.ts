import { create } from 'zustand';

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
  login: (email: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: localStorage.getItem('kono_auth') === 'true',
  user: localStorage.getItem('kono_auth') === 'true' ? {
    id: 'usr_1',
    name: 'Dylan P.',
    email: 'dylan@kono.ai',
    role: 'Lead Financial Auditor',
  } : null,
  login: async (email: string) => {
    // Simulated sleek login network latency
    await new Promise((r) => setTimeout(r, 600));
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
  logout: () => {
    localStorage.removeItem('kono_auth');
    set({ isAuthenticated: false, user: null });
  },
}));
