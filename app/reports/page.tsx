'use client';

import { useState, useMemo, useEffect } from 'react';
import { useProperty } from '@/components/providers/property-provider';
import { createClient } from '@/lib/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  BarChart3, 
  ArrowUpRight, 
  Download, 
  CreditCard,
  BedDouble,
  Activity,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, subMonths, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function ReportsPage() {
  const { currentProperty } = useProperty();
  const supabase = createClient();
  const [range, setRange] = useState<'current' | 'last'>('current');
  const [data, setData] = useState<{
    bookings: any[];
    rooms: any[];
    payments: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!currentProperty) return;
    setLoading(true);

    const [bookingsRes, roomsRes, paymentsRes] = await Promise.all([
      supabase.from('Booking').select('*, BookingRoom(*)').eq('propertyId', currentProperty.id),
      supabase.from('Room').select('*, RoomType!inner(*)').eq('RoomType.propertyId', currentProperty.id),
      supabase.from('Payment').select('*').eq('tenantId', currentProperty.tenantId)
    ]);

    setData({
      bookings: bookingsRes.data || [],
      rooms: roomsRes.data || [],
      payments: paymentsRes.data || []
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentProperty]);

  // Derived Statistics
  const stats = useMemo(() => {
    if (!data) return null;
    const { bookings, rooms, payments } = data;

    const now = new Date();
    const start = range === 'current' ? startOfMonth(now) : startOfMonth(subMonths(now, 1));
    const end = range === 'current' ? endOfMonth(now) : endOfMonth(subMonths(now, 1));

    const totalRooms = rooms.length;
    const daysInInterval = eachDayOfInterval({ start, end });

    // Filter relevant bookings
    const filteredBookings = bookings.filter(b => 
      b.status !== 'CANCELLED' && 
      isWithinInterval(new Date(b.checkInDate), { start, end })
    );

    // Revenue calculation
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
    const occupiedNights = filteredBookings.reduce((sum, b) => {
      const nights = differenceInDays(new Date(b.checkOutDate), new Date(b.checkInDate)) || 1;
      const roomsCount = b.BookingRoom?.length || 1; // Default to 1 if not assigned
      return sum + (nights * roomsCount);
    }, 0); 
    const totalPossibleNights = totalRooms * daysInInterval.length;

    const occupancyRate = totalPossibleNights > 0 ? (occupiedNights / totalPossibleNights) * 100 : 0;
    const adr = occupiedNights > 0 ? totalRevenue / occupiedNights : 0;
    const revpar = totalPossibleNights > 0 ? totalRevenue / totalPossibleNights : 0;

    // Daily Revenue Data for Chart
    const dailyData = daysInInterval.map(day => {
      const dayStr = format(day, 'MMM dd');
      const dayRev = bookings.filter(b => 
        b.status !== 'CANCELLED' &&
        format(new Date(b.createdAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      ).reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

      return { name: dayStr, revenue: dayRev };
    });

    // Source Distribution
    const sources = [
      { name: 'Direct', value: filteredBookings.filter(b => b.source === 'DIRECT').length, color: '#0ea5e9' },
      { name: 'OTA', value: filteredBookings.filter(b => b.source === 'OTA').length, color: '#8b5cf6' },
      { name: 'Engine', value: filteredBookings.filter(b => b.source === 'BOOKING_ENGINE').length, color: '#10b981' },
    ];

    return {
      revenue: totalRevenue,
      occupancy: occupancyRate,
      adr,
      revpar,
      dailyData,
      sources: sources.filter(s => s.value > 0)
    };
  }, [data, range]);

  if (loading || !stats) return (
    <div className="p-8 flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Analyzing Performance Metrics...<br/>
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Travels Puri 13</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Property Insights</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Live analytics for {currentProperty?.name}</p>
        </div>
        
        <div className="flex items-center bg-secondary/30 p-1 rounded-xl w-fit border shadow-sm">
          <Button 
            variant={range === 'current' ? 'default' : 'ghost'} 
            size="sm" 
            className="rounded-lg font-bold text-xs"
            onClick={() => setRange('current')}
          >
            Current Month
          </Button>
          <Button 
            variant={range === 'last' ? 'default' : 'ghost'} 
            size="sm" 
            className="rounded-lg font-bold text-xs"
            onClick={() => setRange('last')}
          >
            Last Month
          </Button>
        </div>
      </header>

      {/* High Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, sub: 'Booked value', icon: CreditCard, color: 'bg-blue-500' },
          { label: 'Occupancy Rate', value: `${stats.occupancy.toFixed(1)}%`, sub: 'Inventory utilized', icon: BedDouble, color: 'bg-emerald-500' },
          { label: 'ADR', value: `₹${stats.adr.toFixed(0)}`, sub: 'Avg Daily Rate', icon: TrendingUp, color: 'bg-violet-500' },
          { label: 'RevPAR', value: `₹${stats.revpar.toFixed(0)}`, sub: 'Rev Per Avail Room', icon: BarChart3, color: 'bg-amber-500' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="premium-card relative overflow-hidden group border-none shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start relative z-10">
                  <div className={`p-2 rounded-xl ${item.color}/10 text-${item.color.split('-')[1]}-600`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 relative z-10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <h3 className="text-2xl font-black mt-1">{item.value}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">{item.sub}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue Chart */}
        <Card className="lg:col-span-2 premium-card border-none shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold">Revenue Pulse</CardTitle>
              <CardDescription className="text-xs font-medium">Sales trends for {range === 'current' ? 'Current Month' : 'Last Month'}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  interval={4}
                />
                <YAxis hide={true} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#0ea5e9" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card className="premium-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-center">Channels</CardTitle>
            <CardDescription className="text-xs font-medium text-center">Reservation sources</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-0 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.sources}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={10}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.sources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="p-6 border-t font-bold text-[10px] flex justify-between uppercase tracking-widest">
            <span className="text-muted-foreground">Top Channel</span>
            <span className="text-primary">{stats.sources[0]?.name || 'Direct'}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
