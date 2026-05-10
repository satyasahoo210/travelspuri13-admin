'use client';

import { subscribeUser } from '@/app/actions';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bell, Download, Smartphone, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const handleSnooze = () => {
    const snoozeUntil = Date.now() + 60 * 60 * 1000; // 1 hour from now
    localStorage.setItem('pwa_install_snooze', snoozeUntil.toString());
    setShowInstallPrompt(false);
  };

  useEffect(() => {
    // 1. Service Worker Registration
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }

    const snoozeUntil = localStorage.getItem('pwa_install_snooze');
    if (snoozeUntil && Date.now() < parseInt(snoozeUntil)) {
      return;
    }

    // 2. Install Prompt Logic
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show prompt if user is logged in
      if (user) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. iOS Detection
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [user]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      setShowInstallPrompt(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      
      const serializedSub = JSON.parse(JSON.stringify(subscription));
      await subscribeUser(serializedSub);
    }
  };

  // Show iOS specific instructions if logged in and not standalone
  useEffect(() => {
    const snoozeUntil = localStorage.getItem('pwa_install_snooze');
    if (snoozeUntil && Date.now() < parseInt(snoozeUntil)) {
      return;
    }
    if (user && isIOS && !isStandalone) {
      setShowInstallPrompt(true);
    }
  }, [user, isIOS, isStandalone]);

  return (
    <>
      {children}
      
      <Dialog open={showInstallPrompt} onOpenChange={setShowInstallPrompt}>
        <DialogContent className="sm:max-w-md rounded-[2rem]">
          <DialogHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
              <Smartphone size={24} />
            </div>
            <DialogTitle className="text-2xl font-heading font-bold">Install Travels Puri 13 PMS</DialogTitle>
            <DialogDescription className="text-gray-500">
              Install our app for a faster experience, offline access, and real-time notifications.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                <Zap size={18} />
              </div>
              <p className="text-sm font-medium">Lightning fast performance</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                <Bell size={18} />
              </div>
              <p className="text-sm font-medium">Real-time alerts</p>
            </div>

            {isIOS && (
              <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 text-xs leading-relaxed">
                <p className="font-bold text-primary mb-1 uppercase tracking-wider">iOS Instructions:</p>
                Tap the <span className="font-bold">Share</span> button and select <span className="font-bold">"Add to Home Screen"</span> to install.
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={handleSnooze} className="rounded-full">
              Maybe Later
            </Button>
            {!isIOS && (
              <Button onClick={handleInstall} className="rounded-full px-8 gap-2">
                <Download size={18} /> Install Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
