'use client';

import { BottomNav, Sidebar } from '@/components/layout/navigation';
import { usePathname } from 'next/navigation';

export function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/';

  if (isAuthPage) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
