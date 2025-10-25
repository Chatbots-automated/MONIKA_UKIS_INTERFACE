import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'admin' | 'vet' | 'tech' | 'viewer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (action: string) => boolean;
  isAdmin: boolean;
  isVet: boolean;
  isTech: boolean;
  isViewer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'vetstock_user_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const userData = JSON.parse(savedSession);
        setUser(userData);
      } catch (err) {
        console.error('Error parsing saved session:', err);
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase
        .rpc('verify_password', {
          p_email: email,
          p_password: password
        });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Invalid email or password');
      }

      const userData = data[0];

      await supabase.rpc('update_last_login', {
        p_user_id: userData.user_id
      });

      const { data: fullUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userData.user_id)
        .single();

      if (fetchError) throw fetchError;

      setUser(fullUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(fullUser));
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const hasPermission = (action: string): boolean => {
    if (!user) return false;

    const role = user.role;

    switch (action) {
      case 'manage_users':
      case 'settings':
        return role === 'admin';

      case 'treatment':
      case 'delete':
        return role === 'admin' || role === 'vet';

      case 'receive_stock':
      case 'biocides':
      case 'waste':
      case 'products':
      case 'animals':
      case 'suppliers':
        return role === 'admin' || role === 'vet' || role === 'tech';

      case 'view':
        return true;

      default:
        return false;
    }
  };

  const isAdmin = user?.role === 'admin';
  const isVet = user?.role === 'vet';
  const isTech = user?.role === 'tech';
  const isViewer = user?.role === 'viewer';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signOut,
      hasPermission,
      isAdmin,
      isVet,
      isTech,
      isViewer
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
