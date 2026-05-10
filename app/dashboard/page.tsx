'use client';

import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { useProperty } from "@/components/providers/property-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/utils/supabase/client";
import { endOfDay, format, isSameDay, startOfDay, subDays } from "date-fns";
import { motion } from "framer-motion";
import { Activity, ArrowDownRight, ArrowUpRight, BedDouble, CreditCard, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { currentProperty } = useProperty();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [roomStats, setRoomStats] = useState({ available: 0, occupied: 0, cleaning: 0, total: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentProperty) return;
      setLoading(true);

      try {
        const today = new Date();
        const startOfToday = startOfDay(today).toISOString();
        const endOfToday = endOfDay(today).toISOString();
        const sevenDaysAgo = startOfDay(subDays(today, 6)).toISOString();

        // 1. Fetch Rooms for Status
        const { data: rooms } = await supabase
          .from('Room')
          .select('id, status, roomTypeId, RoomType!inner(propertyId)')
          .eq('RoomType.propertyId', currentProperty.id);

        // 2. Fetch Payments for Revenue
        const { data: payments } = await supabase
          .from('Payment')
          .select('amount, createdAt, Booking!inner(propertyId)')
          .eq('Booking.propertyId', currentProperty.id)
          .gte('createdAt', sevenDaysAgo);

        const revenueToday = payments?.filter(p => isSameDay(new Date(p.createdAt!), today))
          .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        // 3. Fetch Bookings for Check-ins, Guests, and Occupancy
        const { data: bookings } = await supabase
          .from('Booking')
          .select('id, status, adults, children, checkInDate, checkOutDate, Guest(name), BookingRoom(quantity)')
          .eq('propertyId', currentProperty.id)
          .neq('status', 'CANCELLED');

        const checkinsToday = bookings?.filter(b => isSameDay(new Date(b.checkInDate), today)).length || 0;
        const totalGuests = bookings?.filter(b => b.status === 'CHECKED_IN')
          .reduce((sum, b) => sum + (b.adults || 0) + (b.children || 0), 0) || 0;

        // Calculate Occupancy from Bookings
        const occupiedRoomsToday = bookings?.filter(b => {
          if (b.status === 'CANCELLED') return false;
          const start = startOfDay(new Date(b.checkInDate));
          const end = startOfDay(new Date(b.checkOutDate));
          // Room is occupied if today is between check-in and the day before check-out
          // OR if it's already checked in (in case of dates mismatch)
          return (today >= start && today < end) || b.status === 'CHECKED_IN';
        }).reduce((sum, b) => {
          const roomsCount = b.BookingRoom?.reduce((s: number, br: any) => s + (br.quantity || 1), 0) || 0;
          return sum + roomsCount;
        }, 0) || 0;

        const counts = {
          available: 0,
          occupied: occupiedRoomsToday,
          cleaning: rooms?.filter(r => r.status === 'MAINTENANCE' || r.status === 'DIRTY').length || 0,
          total: rooms?.length || 0
        };

        counts.available = counts.total - counts.occupied - counts.cleaning;
        setRoomStats(counts);

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

        // 5. Chart Data (Last 7 days)
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const chart = Array.from({ length: 7 }).map((_, i) => {
          const d = subDays(today, 6 - i);
          const dayPayments = payments?.filter(p => isSameDay(new Date(p.createdAt!), d)) || [];
          return {
            day: days[d.getDay()],
            revenue: dayPayments.reduce((sum, p) => sum + Number(p.amount), 0),
            occupancy: 0 // Placeholder
          };
        });
        setChartData(chart);

        // Final Stats Array
        setStats([
          { 
            label: 'Occupancy', 
            value: counts.total ? `${Math.round((occupiedRoomsToday / counts.total) * 100)}%` : '0%', 
            sub: `${occupiedRoomsToday} rooms booked`, 
            trend: 'neutral', 
            icon: BedDouble 
          },
          { label: 'Revenue Today', value: `₹${revenueToday.toLocaleString()}`, sub: 'From payments', trend: 'up', icon: CreditCard },
          { label: 'Check-ins', value: checkinsToday.toString(), sub: 'Expected today', trend: 'neutral', icon: Activity },
          { label: 'Total Guests', value: totalGuests.toString(), sub: 'Currently in-house', trend: 'up', icon: Users },
        ]);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentProperty]);

  if (!currentProperty) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Selecting your property...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, here's what's happening at {currentProperty.name}.</p>
        </div>
        <div className="hidden md:block">
           <p className="text-sm font-medium text-muted-foreground">{format(new Date(), 'EEEE, MMMM dd, yyyy')}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="premium-card overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary/5 rounded-lg">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  {stat.trend === 'up' ? (
                    <div className="flex items-center text-xs font-medium text-emerald-600">
                      {stat.sub} <ArrowUpRight className="ml-1 h-3 w-3" />
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-muted-foreground">
                      {stat.sub}
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 premium-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading">Revenue Trends</CardTitle>
              <p className="text-xs text-muted-foreground">Daily performance for the current week</p>
            </div>
          </CardHeader>
          <CardContent>
            <AnalyticsChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="font-heading">Room Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Available</span>
                  <span className="font-bold">{roomStats.available}</span>
                </div>
                <div className="w-full bg-secondary/50 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${roomStats.total ? (roomStats.available / roomStats.total) * 100 : 0}%` }} />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Occupied</span>
                  <span className="font-bold">{roomStats.occupied}</span>
                </div>
                <div className="w-full bg-secondary/50 h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: `${roomStats.total ? (roomStats.occupied / roomStats.total) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Cleaning / Maintenance</span>
                  <span className="font-bold">{roomStats.cleaning}</span>
                </div>
                <div className="w-full bg-secondary/50 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full" style={{ width: `${roomStats.total ? (roomStats.cleaning / roomStats.total) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-xs font-bold text-primary uppercase tracking-tight mb-2">Inventory Summary</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You have {roomStats.total} total rooms. {roomStats.available} are ready for new bookings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="font-heading">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivity.length > 0 ? recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-xs text-primary">
                    {item.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name} <span className="text-muted-foreground font-normal">{item.action}</span></p>
                    <p className="text-xs text-muted-foreground">{item.detail} • {item.time}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "font-normal text-[10px] uppercase tracking-wider",
                      item.status === 'CANCELLED' ? "text-destructive border-destructive/20 bg-destructive/5" : ""
                    )}
                  >
                    {item.status}
                  </Badge>
                </div>
              )) : (
                <p className="text-sm text-center text-muted-foreground py-8">No recent activity found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
