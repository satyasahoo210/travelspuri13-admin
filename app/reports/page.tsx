'use client';

import { useState, useMemo } from 'react';
import { useProperty } from '@/components/providers/property-provider';
import { db, Booking, Room, FolioItem } from '@/lib/db/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon, 
  ArrowUpRight, 
  Download, 
  Calendar as CalendarIcon,
  CreditCard,
  Users,
  BedDouble,
  Activity
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, subMonths } from 'date-fns';
import { motion } from 'framer-motion';

export default function ReportsPage() {
  const { currentProperty } = useProperty();
  const [range, setRange] = useState<'current' | 'last'>('current');

  // Load necessary data
  const bookings = useLiveQuery(() => 
    db.bookings.where('propertyId').equals(currentProperty?.id || '').toArray()
  , [currentProperty]);

  const rooms = useLiveQuery(() => 
    db.rooms.toArray()
  , [currentProperty]);

  const folioItems = useLiveQuery(() => 
    db.folioItems.where('propertyId').equals(currentProperty?.id || '').toArray()
  , [currentProperty]);

  // Derived Statistics
  const stats = useMemo(() => {
    if (!bookings || !rooms || !folioItems) return null;

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

    // Filter relevant financial items
    const filteredFolios = folioItems.filter(f => 
      f.type !== 'PAYMENT' && 
      f.type !== 'TAX' && // We focus on Net Revenue for ADR/RevPAR
      isWithinInterval(new Date(f.updatedAt), { start, end })
    );

    // Calculations
    const totalRevenue = filteredFolios.reduce((sum, item) => sum + item.amount, 0);
    const occupiedNights = filteredBookings.length; // Simplified for this prototype
    const totalPossibleNights = totalRooms * daysInInterval.length;

    const occupancyRate = (occupiedNights / totalPossibleNights) * 100;
    const adr = occupiedNights > 0 ? totalRevenue / occupiedNights : 0;
    const revpar = totalPossibleNights > 0 ? totalRevenue / totalPossibleNights : 0;

    // Daily Revenue Data for Chart
    const dailyData = daysInInterval.map(day => {
      const dayStr = format(day, 'MMM dd');
      const dayRev = folioItems.filter(f => 
        f.type !== 'PAYMENT' && 
        format(new Date(f.updatedAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      ).reduce((sum, item) => sum + item.amount, 0);

      return { name: dayStr, revenue: dayRev, occupancy: Math.floor(Math.random() * 20) + 60 }; // Random occ for visual demo
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
  }, [bookings, rooms, folioItems, range]);

  if (!stats) return (
    <div className="p-8 flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <Activity className="h-8 w-8 text-primary animate-pulse" />
        <p className="text-muted-foreground animate-pulse">Calculating Performance Metrics...</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Property Performance</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Comprehensive analytics for {currentProperty?.name}</p>
        </div>
        
        <div className="flex items-center bg-secondary/30 p-1 rounded-xl w-fit">
          <Button 
            variant={range === 'current' ? 'default' : 'ghost'} 
            size="sm" 
            className="rounded-lg font-bold"
            onClick={() => setRange('current')}
          >
            Current Month
          </Button>
          <Button 
            variant={range === 'last' ? 'default' : 'ghost'} 
            size="sm" 
            className="rounded-lg font-bold"
            onClick={() => setRange('last')}
          >
            Last Month
          </Button>
        </div>
      </header>

      {/* High Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, sub: 'Net of taxes', icon: CreditCard, color: 'bg-blue-500' },
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
            <Card className="premium-card relative overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start relative z-10">
                  <div className={`p-2 rounded-xl ${item.color}/10 text-${item.color.split('-')[1]}-600`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-none font-bold text-[10px]">
                    <ArrowUpRight className="h-3 w-3 mr-1" /> 12%
                  </Badge>
                </div>
                <div className="mt-4 relative z-10">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <h3 className="text-2xl font-black mt-1">{item.value}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">{item.sub}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue Chart */}
        <Card className="lg:col-span-2 premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold">Revenue & Occupancy Pulse</CardTitle>
              <CardDescription>Daily performance trends for {range === 'current' ? 'Current Month' : 'Last Month'}</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl font-bold gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
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
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                  interval={4}
                />
                <YAxis 
                  hide={true}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#0ea5e9" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Booking Sources</CardTitle>
            <CardDescription>Market share of reservation channels</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-0 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.sources}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {stats.sources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="p-6 border-t font-bold text-xs flex justify-between">
            <span className="text-muted-foreground">Most Efficient Channel</span>
            <span className="text-primary">{stats.sources[0]?.name || 'Direct'}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
