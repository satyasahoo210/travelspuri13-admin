'use client'

import { Tables } from '@/database.types'
import { STORAGE_KEYS } from '@/lib/constants'
import { createClient } from '@/lib/utils/supabase/client'
import { usePathname, useRouter } from 'next/navigation'
import React, { createContext, useContext, useEffect, useState } from 'react'

interface PMSUser {
  id: string
  email: string
  name?: string | null
  role: Tables<'User'>['role']
  tenantId: string
}

interface AuthContextType {
  user: PMSUser | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PMSUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const cachedUserStr = localStorage.getItem(STORAGE_KEYS.USER);

      if (!token || !cachedUserStr) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Set initial fast load state from cache
        const cachedUser = JSON.parse(cachedUserStr);
        setUser(cachedUser);

        // Verify token & get fresh profile in the background
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Session expired');
        }

        const freshUser = await res.json();
        setUser(freshUser);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
        localStorage.setItem(STORAGE_KEYS.TENANT_ID, freshUser.tenantId);
      } catch (err) {
        console.error('Session validation failed:', err);
        // Clear expired credentials
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TENANT_ID);
        localStorage.removeItem(STORAGE_KEYS.PROPERTY_ID);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const logout = async () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
    localStorage.removeItem(STORAGE_KEYS.TENANT_ID)
    localStorage.removeItem(STORAGE_KEYS.PROPERTY_ID)
    setUser(null)
    router.push('/login')
  }

  // Route protection logic
  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/') {
      router.push('/login')
    }
    if (!loading && user && pathname === '/login') {
      router.push('/dashboard')
    }
  }, [user, loading, pathname, router])

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
