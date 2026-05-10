'use client';

import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { useProperty } from "@/components/providers/property-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/utils/supabase/client";
import { endOfDay, format, isSameDay, startOfDay, subDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ArrowDownRight, ArrowUpRight, BedDouble, CreditCard, Loader2, Users, TrendingUp, Calendar, CheckCircle2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

export default function DashboardPage() {
  const { currentProperty } = useProperty();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [roomStats, setRoomStats] = useState({ available: 0, occupied: 0, cleaning: 0, total: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!currentProperty) return;
    
    try {
      const today = new Date();
      const sevenDaysAgo = startOfDay(subDays(today, 6)).toISOString();

      // 1. Fetch Rooms
      const { data: rooms } = await supabase
        .from('Room')
        .select('id, status, roomTypeId, RoomType!inner(propertyId)')
        .eq('RoomType.propertyId', currentProperty.id);

      // 2. Fetch Payments
      const { data: payments } = await supabase
        .from('Payment')
        .select('amount, createdAt, Booking!inner(propertyId)')
        .eq('Booking.propertyId', currentProperty.id)
        .gte('createdAt', sevenDaysAgo);

      const revenueToday = payments?.filter(p => isSameDay(new Date(p.createdAt!), today))
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // 3. Fetch Bookings
      const { data: bookings } = await supabase
        .from('Booking')
        .select('id, status, adults, children, checkInDate, checkOutDate, Guest(name), BookingRoom(quantity)')
        .eq('propertyId', currentProperty.id)
        .neq('status', 'CANCELLED');

      const checkinsToday = bookings?.filter(b => isSameDay(new Date(b.checkInDate), today)).length || 0;
      const totalGuests = bookings?.filter(b => b.status === 'CHECKED_IN')
        .reduce((sum, b) => sum + (b.adults || 0) + (b.children || 0), 0) || 0;

      // Occupancy calculation
      const occupiedRoomsToday = bookings?.filter(b => {
        const start = startOfDay(new Date(b.checkInDate));
        const end = startOfDay(new Date(b.checkOutDate));
        return (today >= start && today < end) || b.status === 'CHECKED_IN';
      }).reduce((sum, b) => {
        const roomsCount = b.BookingRoom?.reduce((s: number, br: any) => s + (br.quantity || 1), 0) || 0;
        return sum + roomsCount;
      }, 0) || 0;

      const cleaningRooms = rooms?.filter(r => r.status === 'MAINTENANCE' || r.status === 'DIRTY').length || 0;
      const totalRooms = rooms?.length || 0;
      const availableRooms = Math.max(0, totalRooms - occupiedRoomsToday - cleaningRooms);

      setRoomStats({
        available: availableRooms,
        occupied: occupiedRoomsToday,
        cleaning: cleaningRooms,
        total: totalRooms
      });

      // 4. Activity Feed
      const { data: latestBookings } = await supabase
        .from('Booking')
        .select('id, status, createdAt, Guest(name), checkInDate')
        .eq('propertyId', currentProperty.id)
        .order('createdAt', { ascending: false })
        .limit(5);

      setRecentActivity(latestBookings?.map(b => ({
        name: b.Guest?.name || 'Unknown',
        action: b.status === 'CHECKED_IN' ? 'is checked in' : 
                b.status === 'CHECKED_OUT' ? 'checked out' :
                b.status === 'CANCELLED' ? 'cancelled' : 'booked',
        detail: format(new Date(b.checkInDate), 'MMM dd'),
        time: format(new Date(b.createdAt!), 'hh:mm a'),
        status: b.status
      })) || []);

      // 5. Chart Data
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const chart = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(today, 6 - i);
        const dayPayments = payments?.filter(p => isSameDay(new Date(p.createdAt!), d)) || [];
        return {
          day: days[d.getDay()],
          revenue: dayPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          occupancy: 0 
        };
      });
      setChartData(chart);

      setStats([
        { 
          label: 'Occupancy', 
          value: totalRooms ? `${Math.round((occupiedRoomsToday / totalRooms) * 100)}%` : '0%', 
          sub: `${occupiedRoomsToday} rooms live`, 
          trend: 'neutral', 
          icon: BedDouble,
          color: 'bg-indigo-500'
        },
        { 
          label: 'Revenue Today', 
          value: `₹${revenueToday.toLocaleString()}`, 
          sub: 'Collected today', 
          trend: 'up', 
          icon: CreditCard,
          color: 'bg-emerald-500'
        },
        { 
          label: 'Check-ins', 
          value: checkinsToday.toString(), 
          sub: 'Arrivals today', 
          trend: 'neutral', 
          icon: Calendar,
          color: 'bg-amber-500'
        },
        { 
          label: 'In-House', 
          value: totalGuests.toString(), 
          sub: 'Active guests', 
          trend: 'up', 
          icon: Users,
          color: 'bg-pink-500'
        },
      ]);

    } catch (error) {
      console.error('Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentProperty]);

  useEffect(() => {
    fetchDashboardData();

    if (currentProperty) {
      const channel = supabase
        .channel('dashboard-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Booking', filter: `propertyId=eq.${currentProperty.id}` }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Payment' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Room' }, () => fetchDashboardData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentProperty, fetchDashboardData]);

  if (!currentProperty) return (
    <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Initializing...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Operations Hub</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Live intelligence for {currentProperty.name}
          </p>
        </div>
        <div className="bg-slate-100 px-6 py-3 rounded-2xl flex items-center gap-4 border border-white shadow-sm">
           <Calendar className="h-5 w-5 text-slate-400" />
           <p className="text-xs font-black uppercase tracking-widest text-slate-600">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="relative group"
            >
              <Card className="border-none shadow-xl hover:shadow-2xl transition-all rounded-[2.5rem] overflow-hidden bg-white">
                <div className={cn("absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl rounded-full -mr-16 -mt-16 transition-all group-hover:opacity-20", stat.color)} />
                <CardContent className="p-8">
                  <div className="flex justify-between items-start relative z-10">
                    <div className={cn("p-4 rounded-2xl text-white shadow-lg", stat.color)}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                    {stat.trend === 'up' && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-3 py-1 rounded-full font-black text-[9px] tracking-widest">
                        GROWING
                      </Badge>
                    )}
                  </div>
                  <div className="mt-8">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{stat.label}</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1.5">
                      {stat.sub}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Revenue Velocity</CardTitle>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Financial performance • Last 7 Days</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <AnalyticsChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-32 -mt-32" />
          <CardHeader className="p-8 relative z-10">
            <CardTitle className="text-xl font-black uppercase tracking-tight">Room Inventory</CardTitle>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Real-time room status</p>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-8 relative z-10">
            {[
              { label: 'Ready to Sell', count: roomStats.available, total: roomStats.total, color: 'bg-emerald-500' },
              { label: 'Stay-over / Occupied', count: roomStats.occupied, total: roomStats.total, color: 'bg-primary' },
              { label: 'Cleaning Needed', count: roomStats.cleaning, total: roomStats.total, color: 'bg-amber-400' }
            ].map((item) => (
              <div key={item.label} className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{item.label}</span>
                  <span className="text-lg font-black">{item.count}</span>
                </div>
                <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.total ? (item.count / item.total) * 100 : 0}%` }}
                    className={cn("h-full rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)]", item.color)} 
                  />
                </div>
              </div>
            ))}

            <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/80">System Health</p>
              </div>
              <p className="text-xs font-medium text-white/40 leading-relaxed">
                All data is synchronized with your cloud instance. Property status is optimal.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50">
            <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Live Activity Feed</CardTitle>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Latest updates from front desk</p>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {recentActivity.length > 0 ? recentActivity.map((item, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-6 group"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-sm text-slate-900 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    {item.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                    item.status === 'CHECKED_IN' ? "bg-emerald-500" : "bg-slate-300"
                  )} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900">{item.name} <span className="text-slate-400 font-bold lowercase tracking-normal">{item.action}</span></p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{item.detail} • {item.time}</p>
                </div>
                <Badge 
                  className={cn(
                    "font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full border-none shadow-sm",
                    item.status === 'CHECKED_IN' ? "bg-emerald-100 text-emerald-600" :
                    item.status === 'CANCELLED' ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {item.status}
                </Badge>
              </motion.div>
            )) : (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full mx-auto flex items-center justify-center">
                  <Activity className="h-6 w-6 text-slate-200" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">No recent operational logs.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
