'use client';

import { useOfflineStatus } from '@/hooks/use-offline-status';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export function SyncIndicator() {
  const { isOnline } = useOfflineStatus();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // Simulate or hook into real sync status later
  useEffect(() => {
    if (isOnline) {
      setSyncStatus('syncing');
      const timer = setTimeout(() => setSyncStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  return (
    <div className="fixed top-4 right-4 z-50">
      <AnimatePresence mode="wait">
        {!isOnline ? (
          <motion.div
            key="offline"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Badge variant="destructive" className="gap-1.5 py-1 px-3 shadow-sm">
              <WifiOff className="h-3.5 w-3.5" />
              Offline
            </Badge>
          </motion.div>
        ) : syncStatus === 'syncing' ? (
          <motion.div
            key="syncing"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Badge variant="secondary" className="gap-1.5 py-1 px-3 shadow-sm bg-primary/10 text-primary border-primary/20">
              <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
              Syncing...
            </Badge>
          </motion.div>
        ) : (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 1 }}
          >
            <Badge variant="outline" className="gap-1.5 py-1 px-3 shadow-sm bg-background border-border/50 text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              All changes saved
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
