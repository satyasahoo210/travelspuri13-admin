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
        let res = await fetch(`/api/v1/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
          const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

          if (rememberMe && refreshToken) {
            console.log('Token expired, attempting refresh...');
            const refreshRes = await fetch(`/api/v1/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              localStorage.setItem(STORAGE_KEYS.TOKEN, refreshData.access_token);
              if (refreshData.refresh_token) {
                localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshData.refresh_token);
              }
              localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(refreshData.user));
              localStorage.setItem(STORAGE_KEYS.TENANT_ID, refreshData.user.tenantId);

              // Retry fetching the profile with the new token
              res = await fetch(`/api/v1/auth/profile`, {
                headers: {
                  'Authorization': `Bearer ${refreshData.access_token}`,
                },
              });
            }
          }
        }

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
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
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
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME)
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
