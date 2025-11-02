import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'admin' | 'vet' | 'tech' | 'viewer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  is_frozen: boolean;
  frozen_at: string | null;
  frozen_by: string | null;
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
  logAction: (action: string, tableName?: string, recordId?: string, oldData?: any, newData?: any) => Promise<void>;
  isAdmin: boolean;
  isVet: boolean;
  isTech: boolean;
  isViewer: boolean;
  isFrozen: boolean;
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

      await supabase.rpc('log_user_action', {
        p_user_id: fullUser.id,
        p_action: 'user_login',
        p_table_name: null,
        p_record_id: null,
        p_old_data: null,
        p_new_data: { email: fullUser.email, role: fullUser.role, full_name: fullUser.full_name },
      });
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    if (user) {
      await supabase.rpc('log_user_action', {
        p_user_id: user.id,
        p_action: 'user_logout',
        p_table_name: null,
        p_record_id: null,
        p_old_data: null,
        p_new_data: null,
      });
    }
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const logAction = async (
    action: string,
    tableName?: string,
    recordId?: string,
    oldData?: any,
    newData?: any
  ) => {
    if (!user) {
      console.warn('Cannot log action: no user logged in');
      return;
    }

    try {
      console.log('Logging action:', { action, tableName, recordId, newData });
      const { data, error } = await supabase.rpc('log_user_action', {
        p_user_id: user.id,
        p_action: action,
        p_table_name: tableName || null,
        p_record_id: recordId || null,
        p_old_data: oldData || null,
        p_new_data: newData || null,
      });

      if (error) {
        console.error('Error logging action:', error);
        throw error;
      }

      console.log('Action logged successfully:', data);
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  };

  const hasPermission = (action: string): boolean => {
    if (!user) return false;
    if (user.is_frozen) return false;

    const role = user.role;

    switch (action) {
      case 'manage_users':
      case 'settings':
      case 'audit_logs':
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
  const isFrozen = user?.is_frozen || false;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signOut,
      hasPermission,
      logAction,
      isAdmin,
      isVet,
      isTech,
      isViewer,
      isFrozen
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
