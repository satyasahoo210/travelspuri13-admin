'use client';

import {
  BookingActivityChart,
  OccupancyBarChart,
  RevenueTrendChart,
  SourceDistribution
} from "@/components/dashboard/dashboard-charts";
import { useProperty } from "@/components/providers/property-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tables } from "@/database.types";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/utils/supabase/client";
import {
  differenceInDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears
} from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BedDouble,
  Calendar,
  ChevronDown,
  CreditCard,
  Filter,
  Loader2,
  TrendingUp,
  Users
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type TimeRange = 'today' | 'last-week' | 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'custom';

type Booking = Tables<"Booking"> & {
  Guest: Pick<Tables<"Guest">, 'name'>;
  BookingRoom: Pick<Tables<"BookingRoom">, 'quantity'>[];
};
type Payment = Pick<Tables<"Payment">, 'amount' | 'createdAt'> & {
  Booking: Pick<Tables<"Booking">, 'propertyId'>;
};
type Room = Pick<Tables<"Room">, 'id' | 'status' | 'roomTypeId'> & {
  RoomType: Pick<Tables<"RoomType">, 'propertyId'>;
};

type DashboardData = {
  bookings: Booking[];
  payments: Payment[];
  rooms: Room[];
  totalRooms: number;
};

export default function DashboardPage() {
  const { currentProperty } = useProperty();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>('today');
  const [customRange, setCustomRange] = useState({ from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') });
  const [data, setData] = useState<DashboardData | null>(null);

  const dateInterval = useMemo(() => {
    const now = new Date();
    let start = startOfDay(now);
    let end = endOfDay(now);

    switch (range) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'last-week':
        start = subDays(startOfDay(now), 7);
        end = endOfDay(now);
        break;
      case 'this-month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'last-month':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case 'this-year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'last-year':
        start = startOfYear(subYears(now, 1));
        end = endOfYear(subYears(now, 1));
        break;
      case 'custom':
        try {
          start = startOfDay(parseISO(customRange.from));
          end = endOfDay(parseISO(customRange.to));
        } catch {
          start = startOfDay(now);
          end = endOfDay(now);
        }
        break;
    }
    return { start, end };
  }, [range, customRange]);

  const fetchData = useCallback(async (from?: Date) => {
    if (!currentProperty) return;
    setLoading(true);

    try {
      // 1. Fetch Rooms (Total Inventory)
      const { data: rooms } = await supabase
        .from('Room')
        .select('id, status, roomTypeId, RoomType!inner(propertyId)')
        .eq('RoomType.propertyId', currentProperty.id);

      // 2. Fetch Payments (Revenue) - Fetch for a larger range to support individual chart filters
      const yearStart = from ?? startOfYear(subYears(new Date(), 1)); // Start of last year
      const { data: payments } = await supabase
        .from('Payment')
        .select('amount, createdAt, Booking!inner(propertyId)')
        .eq('Booking.propertyId', currentProperty.id)
        .gte('createdAt', yearStart.toISOString());

      // 3. Fetch Bookings (Activity & Occupancy)
      const { data: bookings } = await supabase
        .from('Booking')
        .select('*, Guest(name), BookingRoom(quantity)')
        .eq('propertyId', currentProperty.id)
        .neq('status', 'CANCELLED');

      setData({
        bookings: bookings || [],
        payments: payments || [],
        rooms: rooms || [],
        totalRooms: rooms?.length || 0
      });
    } catch (error) {
      console.error('Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentProperty]);

  useEffect(() => {
    if (!data) {
      fetchData();
    } else if (range === 'custom') {
      fetchData(startOfYear(dateInterval.start));
    }
  }, [fetchData, range, dateInterval.end, dateInterval.start]);

  const metrics = useMemo(() => {
    if (!data) return null;

    const { bookings, payments, totalRooms } = data;
    const { start, end } = dateInterval;
    const days = eachDayOfInterval({ start, end });

    // Filter payments in range
    const totalRevenue = payments.filter(p => {
      const created = new Date(p.createdAt!);
      return created >= start && created <= end;
    }).reduce((sum, p) => sum + Number(p.amount), 0);

    // Bookings created in range
    const rangeBookings = bookings.filter(b => {
      const created = new Date(b.createdAt!);
      return created >= start && created <= end;
    });

    // Total guests in range bookings
    const totalGuests = rangeBookings.reduce((sum, b) => sum + (b.adults || 0) + (b.children || 0), 0);

    // Occupancy Calculation
    const totalAvailableNights = totalRooms * days.length;

    let occupiedRoomNights = 0;
    const dailyOccupancy = days.map(day => {
      const d = startOfDay(day);
      const occupiedRooms = bookings.reduce((sum, b) => {
        const checkIn = startOfDay(new Date(b.checkInDate));
        const checkOut = startOfDay(new Date(b.checkOutDate));
        if (d >= checkIn && d < checkOut) {
          const roomsCount = b.BookingRoom?.reduce((s: number, br: any) => s + (br.quantity || 1), 0) || 1;
          return sum + roomsCount;
        }
        return sum;
      }, 0);
      occupiedRoomNights += occupiedRooms;
      return {
        date: format(d, 'MMM dd'),
        occupancy: totalRooms > 0 ? Math.min(100, Math.round((occupiedRooms / totalRooms) * 100)) : 0
      };
    });

    const overallOccupancy = totalAvailableNights > 0 ? (occupiedRoomNights / totalAvailableNights) * 100 : 0;

    return {
      totalRevenue,
      totalBookings: rangeBookings.length,
      totalGuests,
      occupancy: overallOccupancy
    };
  }, [data, dateInterval]);

  if (!currentProperty || loading || !metrics) return (
    <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Analyzing Data Hub...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header & Global Filter */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Operations Hub</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-primary" /> Performance Analytics for {currentProperty.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <Select value={range} onValueChange={(val: TimeRange | null) => val && setRange(val)}>
              <SelectTrigger className="w-[160px] border-none bg-transparent shadow-none font-bold text-xs uppercase tracking-wider h-9 focus:ring-0">
                <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
                <SelectValue placeholder="Select Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Dates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {range === 'custom' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <Input
                type="date"
                value={customRange.from}
                onChange={(e) => setCustomRange(prev => ({ ...prev, from: e.target.value }))}
                className="h-9 w-[135px] text-[10px] font-black uppercase rounded-xl border-slate-200"
              />
              <span className="text-slate-400 font-bold text-[10px] uppercase">to</span>
              <Input
                type="date"
                value={customRange.to}
                onChange={(e) => setCustomRange(prev => ({ ...prev, to: e.target.value }))}
                className="h-9 w-[135px] text-[10px] font-black uppercase rounded-xl border-slate-200"
              />
            </motion.div>
          )}

          <div className="hidden sm:flex items-center bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              {format(dateInterval.start, 'MMM dd')} - {format(dateInterval.end, 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: 'Total Revenue',
            value: `₹${metrics.totalRevenue.toLocaleString()}`,
            sub: 'Collected payments',
            icon: CreditCard,
            color: 'bg-emerald-500',
            href: '/payments'
          },
          {
            label: 'Total Bookings',
            value: metrics.totalBookings.toString(),
            sub: 'New reservations',
            icon: Calendar,
            color: 'bg-blue-500',
            href: '/bookings'
          },
          {
            label: 'Total Guests',
            value: metrics.totalGuests.toString(),
            sub: 'Expected arrivals',
            icon: Users,
            color: 'bg-violet-500',
            href: '/bookings'
          },
          {
            label: 'Room Occupancy',
            value: `${Math.round(metrics.occupancy)}%`,
            sub: 'Inventory utilized',
            icon: BedDouble,
            color: 'bg-amber-500',
            href: '/inventory'
          },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5 }}
          >
            <Link href={item.href}>
              <Card className="border-none shadow-xl hover:shadow-2xl transition-all rounded-[2rem] overflow-hidden bg-white">
                <CardContent className="p-7">
                  <div className="flex justify-between items-start">
                    <div className={cn("p-3 rounded-2xl text-white shadow-lg", item.color)}>
                      <item.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{item.value}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{item.sub}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8 [&>*]:h-1/2">
          <RevenueTrendChart payments={data?.payments || []} />
          <BookingActivityChart bookings={data?.bookings || []} />
        </div>
        <div className="space-y-8 h-full [&>*]:h-1/2">
          <SourceDistribution bookings={data?.bookings || []} />
          <OccupancyBarChart bookings={data?.bookings || []} totalRooms={data?.totalRooms || 0} />
        </div>
      </div>
    </div>
  );
}
