'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarRange, BedDouble, Users, CreditCard, Menu, RefreshCcw, TrendingUp, BarChart3, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Calendar', href: '/calendar', icon: CalendarRange },
  { label: 'Bookings', href: '/bookings', icon: Users },
  { label: 'Inventory', href: '/inventory', icon: BedDouble },
  { label: 'Housekeeping', href: '/housekeeping', icon: RefreshCcw },
  { label: 'Rates', href: '/rates', icon: TrendingUp },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Settings', href: '/settings', icon: CreditCard },
];

import { seedDatabase } from '@/lib/db/seed';
import { PropertySwitcher } from './property-switcher';
import { useAuth } from '@/components/providers/auth-provider';
import { useProperty } from '@/components/providers/property-provider';
import { LogOut } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { currentProperty } = useProperty();

  return (
    <div className="hidden md:flex flex-col w-64 border-r bg-sidebar h-screen sticky top-0">
      <div className="p-6 space-y-6">
        <h1 className="text-xl font-bold tracking-tight text-primary">Antigravity PMS</h1>
        <PropertySwitcher />
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <span className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
              pathname === item.href 
                ? "bg-primary/10 text-primary font-medium" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
              <item.icon className={cn(
                "h-5 w-5 transition-colors",
                pathname === item.href ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t space-y-4">
        {process.env.NODE_ENV === 'development' && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-muted-foreground hover:text-primary transition-colors"
            onClick={() => seedDatabase()}
          >
            Seed Dev Data
          </Button>
        )}
        <div className="flex items-center gap-3 p-2 bg-secondary/20 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">
            {user?.name?.[0].toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email || 'user@example.com'}</p>
          </div>
          <button 
            onClick={() => logout()}
            className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg flex items-center justify-around p-2 z-40 pb-safe">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} className="flex-1">
          <div className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
            pathname === item.href ? "text-primary" : "text-muted-foreground"
          )}>
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
