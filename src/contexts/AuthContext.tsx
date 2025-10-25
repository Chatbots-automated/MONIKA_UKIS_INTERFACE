import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserRole = 'admin' | 'vet' | 'tech' | 'viewer';

export interface UserProfile {
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    return data;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        setProfile(userProfile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  const hasPermission = (action: string): boolean => {
    if (!profile) return false;

    const role = profile.role;

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

  const isAdmin = profile?.role === 'admin';
  const isVet = profile?.role === 'vet';
  const isTech = profile?.role === 'tech';
  const isViewer = profile?.role === 'viewer';

  return (
    <AuthContext.Provider value={{
      user,
      profile,
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
