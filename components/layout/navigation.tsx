'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { cn } from '@/lib/utils'
import Logo from '@/public/logo_large.svg'
import {
  BarChart3,
  BedDouble,
  CalendarRange,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  RefreshCcw,
  Settings2,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PropertySwitcher } from './property-switcher'

const baseNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, enabled: true },
  { label: 'Calendar', href: '/calendar', icon: CalendarRange, enabled: true },
  { label: 'Bookings', href: '/bookings', icon: Users, enabled: true },
  { label: 'Inventory', href: '/inventory', icon: BedDouble, enabled: false},
  { label: 'Housekeeping', href: '/housekeeping', icon: RefreshCcw, enabled: false },
  { label: 'Rates', href: '/rates', icon: TrendingUp, enabled: false },
  { label: 'Reports', href: '/reports', icon: BarChart3, enabled: false },
  { label: 'Messages', href: '/messages', icon: MessageSquare, enabled: false },
  { label: 'Settings', href: '/settings', icon: CreditCard, enabled: false },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const navItems = [...baseNavItems]

  // Conditional Admin & Manage items
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN') {
    navItems.push({ label: 'Manage', href: '/manage', icon: Settings2, enabled: true })
  }
  if (user?.role === 'SUPER_ADMIN') {
    navItems.push({ label: 'Admin', href: '/admin', icon: ShieldAlert, enabled: true })
  }

  return (
    <div className="hidden md:flex flex-col w-64 border-r bg-white h-screen sticky top-0 shadow-sm transition-all duration-300">
      <div className="p-6 space-y-6">
        <Link href="/dashboard" className="block">
          <Logo className="w-full" />
        </Link>
        <PropertySwitcher />
      </div>
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-none">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            aria-disabled={!item.enabled}
            onClick={(e) => {
              if (!item.enabled) e.preventDefault();
            }}
            className={!item.enabled ? "opacity-50 cursor-not-allowed" : ""}
          >
            <span
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group font-bold text-sm',
                pathname === item.href
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 transition-colors',
                  pathname === item.href
                    ? 'text-white'
                    : 'text-slate-400 group-hover:text-slate-600',
                )}
              />
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t space-y-4">
        <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center font-black text-xs text-white">
            {user?.name?.[0].toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tighter">
              {user?.name || 'User'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 truncate tracking-tight lowercase">
              {user?.role?.replace('_', ' ') || 'Staff'}
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-xl transition-all"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const navItems = [...baseNavItems.slice(0, 5)] // Mobile only gets first 5

  // Conditional Manage for mobile if space allows or replaces 5th item
  if ((user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN') && navItems.length >= 5) {
      // Logic for mobile bottom nav can be tricky, keeping it simple for now
  }

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 h-16 bg-white shadow-2xl shadow-slate-900/10 rounded-2xl border border-slate-200 flex items-center justify-around p-2 z-40">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} className="flex-1">
          <div
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-xl transition-all',
              pathname === item.href ? 'text-primary scale-110' : 'text-slate-400',
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
