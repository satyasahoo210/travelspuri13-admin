'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { useOfflineStatus } from '@/hooks/use-offline-status';
import { SyncManager } from '@/lib/sync/sync-manager';
import { createContext, useContext, useEffect } from 'react';
import { useProperty } from './property-provider';

const SyncContext = createContext<{ syncNow: () => Promise<void> } | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isOnline } = useOfflineStatus();
  const { currentProperty } = useProperty();

  useEffect(() => {
    if (isOnline && user) {
      // Periodic sync every 2 minutes when online
      const interval = setInterval(() => {
        SyncManager.syncAll();
      }, 120000);

      // Sync on mount or when property changes
      SyncManager.syncAll();

      return () => clearInterval(interval);
    }
  }, [isOnline, currentProperty?.id, user]);

  const syncNow = async () => {
    if (isOnline && user) {
      await SyncManager.syncAll();
    }
  };

  return (
    <SyncContext.Provider value={{ syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within SyncProvider');
  return context;
};
