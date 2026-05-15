'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subYears
} from "date-fns";
import { Filter } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

type FilterRange = '7d' | '14d' | 'this-month' | 'last-month' | 'this-year' | 'last-year';

function ChartHeader({ title, description, range, onRangeChange }: { title: string; description: string; range: FilterRange; onRangeChange: (val: FilterRange) => void }) {
  return (
    <CardHeader className="p-8 pb-2 flex flex-row items-center justify-between space-y-0">
      <div>
        <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900">{title}</CardTitle>
        <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">{description}</CardDescription>
      </div>
      <Select value={range} onValueChange={(val: FilterRange | null) => onRangeChange(val as FilterRange)}>
        <SelectTrigger className="w-[130px] h-8 text-[10px] font-black uppercase border-slate-200 rounded-xl bg-slate-50/50">
          <Filter className="h-3 w-3 mr-1 text-slate-400" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="14d">Last 14 Days</SelectItem>
          <SelectItem value="this-month">This Month</SelectItem>
          <SelectItem value="last-month">Last Month</SelectItem>
          <SelectItem value="this-year">This Year</SelectItem>
          <SelectItem value="last-year">Last Year</SelectItem>
        </SelectContent>
      </Select>
    </CardHeader>
  );
}

function getRangeInterval(range: FilterRange) {
  const now = new Date();
  let start = startOfDay(now);
  let end = endOfDay(now);
  let granularity: 'day' | 'week' | 'month' = 'day';

  switch (range) {
    case '7d':
      start = subDays(startOfDay(now), 6);
      granularity = 'day';
      break;
    case '14d':
      start = subDays(startOfDay(now), 13);
      granularity = 'day';
      break;
    case 'this-month':
      start = startOfMonth(now);
      end = endOfMonth(now);
      granularity = 'week';
      break;
    case 'last-month':
      start = startOfMonth(subMonths(now, 1));
      end = endOfMonth(subMonths(now, 1));
      granularity = 'week';
      break;
    case 'this-year':
      start = startOfYear(now);
      end = endOfYear(now);
      granularity = 'month';
      break;
    case 'last-year':
      start = startOfYear(subYears(now, 1));
      end = endOfYear(subYears(now, 1));
      granularity = 'month';
      break;
  }
  return { start, end, granularity };
}

export function SourceDistribution({ bookings }: { bookings: any[] }) {
  const [range, setRange] = useState<FilterRange>('7d');

  const data = useMemo(() => {
    const { start, end } = getRangeInterval(range);
    const filtered = bookings.filter(b => {
      const created = new Date(b.createdAt);
      return created >= start && created <= end;
    });

    return [
      { name: 'Direct', value: filtered.filter(b => b.source === 'DIRECT').length },
      { name: 'OTA', value: filtered.filter(b => b.source === 'OTA').length },
      { name: 'Engine', value: filtered.filter(b => b.source === 'BOOKING_ENGINE').length },
      { name: 'Other', value: filtered.filter(b => !['DIRECT', 'OTA', 'BOOKING_ENGINE'].includes(b.source)).length },
    ].filter(s => s.value > 0);
  }, [bookings, range]);

  return (
    <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden h-full">
      <ChartHeader title="Source Distribution" description="Booking channels" range={range} onRangeChange={setRange} />
      <CardContent className="h-[300px] p-8 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={8}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RevenueTrendChart({ payments }: { payments: any[] }) {
  const [range, setRange] = useState<FilterRange>('7d');

  const data = useMemo(() => {
    const { start, end, granularity } = getRangeInterval(range);

    if (granularity === 'day') {
      return eachDayOfInterval({ start, end }).map(date => ({
        date: format(date, 'MMM dd'),
        revenue: payments
          .filter(p => isSameDay(new Date(p.createdAt), date))
          .reduce((sum, p) => sum + Number(p.amount), 0)
      }));
    }

    if (granularity === 'week') {
      return eachWeekOfInterval({ start, end }).map((date, idx) => ({
        date: `W${idx + 1}`,
        revenue: payments
          .filter(p => isSameWeek(new Date(p.createdAt), date))
          .reduce((sum, p) => sum + Number(p.amount), 0)
      }));
    }

    return eachMonthOfInterval({ start, end }).map(date => ({
      date: format(date, 'MMM'),
      revenue: payments
        .filter(p => isSameMonth(new Date(p.createdAt), date))
        .reduce((sum, p) => sum + Number(p.amount), 0)
    }));
  }, [payments, range]);

  return (
    <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
      <ChartHeader title="Revenue Trends" description="Earnings overview" range={range} onRangeChange={setRange} />
      <CardContent className="h-[350px] p-8 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              tickFormatter={(value) => `₹${value >= 1000 ? value / 1000 + 'k' : value}`}
            />
            <Tooltip
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#0ea5e9"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function BookingActivityChart({ bookings }: { bookings: any[] }) {
  const [range, setRange] = useState<FilterRange>('7d');

  const data = useMemo(() => {
    const { start, end, granularity } = getRangeInterval(range);

    if (granularity === 'day') {
      return eachDayOfInterval({ start, end }).map(date => ({
        date: format(date, 'MMM dd'),
        count: bookings.filter(b => isSameDay(new Date(b.createdAt), date)).length
      }));
    }

    if (granularity === 'week') {
      return eachWeekOfInterval({ start, end }).map((date, idx) => ({
        date: `W${idx + 1}`,
        count: bookings.filter(b => isSameWeek(new Date(b.createdAt), date)).length
      }));
    }

    return eachMonthOfInterval({ start, end }).map(date => ({
      date: format(date, 'MMM'),
      count: bookings.filter(b => isSameMonth(new Date(b.createdAt), date)).length
    }));
  }, [bookings, range]);

  return (
    <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
      <ChartHeader title="Booking Activity" description="Reservations volume" range={range} onRangeChange={setRange} />
      <CardContent className="h-[350px] p-8 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
            />
            <Tooltip
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#8b5cf6"
              strokeWidth={4}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function OccupancyBarChart({ bookings, totalRooms }: { bookings: any[]; totalRooms: number }) {
  const [range, setRange] = useState<FilterRange>('7d');
  const { granularity } = getRangeInterval(range);

  const data = useMemo(() => {
    const { start, end } = getRangeInterval(range);

    const calculateOccupancyForInterval = (s: Date, e: Date) => {
      const days = eachDayOfInterval({ start: s, end: e });
      let totalOccupiedNights = 0;
      days.forEach(day => {
        const d = startOfDay(day);
        const occupiedOnDay = bookings.reduce((sum, b) => {
          const checkIn = startOfDay(new Date(b.checkInDate));
          const checkOut = startOfDay(new Date(b.checkOutDate));
          if (d >= checkIn && d < checkOut) {
            return sum + (b.BookingRoom?.reduce((s: number, br: any) => s + (br.quantity || 1), 0) || 1);
          }
          return sum;
        }, 0);
        totalOccupiedNights += occupiedOnDay;
      });
      const capacity = totalRooms * days.length;
      return capacity > 0 ? Math.min(100, Math.round((totalOccupiedNights / capacity) * 100)) : 0;
    };

    if (granularity === 'day') {
      return eachDayOfInterval({ start, end }).map(date => ({
        date: format(date, 'MMM dd'),
        occupancy: calculateOccupancyForInterval(date, date)
      }));
    }

    if (granularity === 'week') {
      return eachWeekOfInterval({ start, end }).map((date, idx) => {
        const wStart = startOfWeek(date);
        const wEnd = endOfWeek(date);
        // Clip to month boundaries
        const actualStart = wStart < start ? start : wStart;
        const actualEnd = wEnd > end ? end : wEnd;
        return {
          date: `W${idx + 1}`,
          occupancy: calculateOccupancyForInterval(actualStart, actualEnd)
        };
      });
    }

    return eachMonthOfInterval({ start, end }).map(date => {
      const mStart = startOfMonth(date);
      const mEnd = endOfMonth(date);
      return {
        date: format(date, 'MMM'),
        occupancy: calculateOccupancyForInterval(mStart, mEnd)
      };
    });
  }, [bookings, totalRooms, range]);

  return (
    <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden h-full">
      <ChartHeader title="Daily Occupancy" description="Room utilization" range={range} onRangeChange={setRange} />
      <CardContent className="h-[350px] p-8 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
              formatter={(value) => [`${value}%`, 'Occupancy']}
            />
            <Bar
              dataKey="occupancy"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
              barSize={granularity === 'day' ? 24 : 40}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
