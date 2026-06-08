import { useAuth } from '@/components/providers/auth-provider';
import { useEffect, useState } from 'react';
import { SyncManager } from '../lib/sync/sync-manager';

export function useOfflineStatus() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if(user){
        SyncManager.syncAll(); // Trigger sync when coming back online
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
