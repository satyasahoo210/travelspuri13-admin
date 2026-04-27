'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/utils/supabase/client';
import { STORAGE_KEYS } from '@/lib/constants';

interface User {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  tenantId: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async (sessionUser: any) => {
      if (!sessionUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Fetch profile data from our User table
      const { data, error } = await supabase
        .from('User')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (data && !error) {
        const userData = {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          tenantId: data.tenantId
        };
        setUser(userData);
        // Store tenantId for legacy components if needed, though Supabase is preferred
        localStorage.setItem(STORAGE_KEYS.TENANT_ID, data.tenantId);
      }
      setLoading(false);
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        fetchUser(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEYS.TENANT_ID);
    localStorage.removeItem(STORAGE_KEYS.PROPERTY_ID);
    setUser(null);
    router.push('/login');
  };

  // Route protection logic
  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/') {
      router.push('/login');
    }
    if (!loading && user && pathname === '/login') {
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
