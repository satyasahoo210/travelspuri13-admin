'use client';

import { useProperty } from '@/components/providers/property-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { gql, TypedDocumentNode } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';
import {
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  formatDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths
} from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import {
  Activity,
  FileSpreadsheet,
  FileText,
  Inbox,
  Loader2,
  Play,
  Search
} from 'lucide-react';
import { useState } from 'react';
import * as XLSX from 'xlsx';

type ReportType = 'occupancy' | 'revenue' | 'booking' | 'payments-due';

type DateFilter = 'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'custom';

const GET_PAYMENTS: TypedDocumentNode<{ payments: any[] }> = gql`
  query GetPayments {
    payments {
      id
      amount
      method
      createdAt
      notes
      bookingId
      Booking {
        id
        Guest {
          id
          name
          email
          phone
        }
      }
    }
  }
`;

const GET_BOOKINGS: TypedDocumentNode<{ bookings: any[] }, { propertyId: string }> = gql`
  query GetBookings($propertyId: String!) {
    bookings(propertyId: $propertyId) {
      id
      checkInDate
      checkOutDate
      status
      source
      totalAmount
      createdAt
      adults
      children
      Guest {
        id
        name
        email
        phone
      }
      BookingRoom {
        id
        roomId
        Room {
          id
          roomNumber
        }
      }
      Payment {
        id
        amount
      }
    }
  }
`;

const GET_ROOMS: TypedDocumentNode<{ rooms: any[] }, { propertyId: string }> = gql`
  query GetRooms($propertyId: String!) {
    rooms(propertyId: $propertyId) {
      id
      roomNumber
      status
      roomTypeId
      RoomType {
        id
        name
        propertyId
      }
    }
  }
`;

export default function ReportsPage() {
  const { currentProperty } = useProperty();
  const [getPayments] = useLazyQuery(GET_PAYMENTS, { fetchPolicy: 'network-only' });
  const [getBookings] = useLazyQuery(GET_BOOKINGS, { fetchPolicy: 'network-only' });
  const [getRooms] = useLazyQuery(GET_ROOMS, { fetchPolicy: 'network-only' });

  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('this-month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [occMonth, setOccMonth] = useState<string | null>(formatDate(new Date(), 'MM'));
  const [occYear, setOccYear] = useState<string | null>(formatDate(new Date(), 'yyyy'));

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[] | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);

  // Helpers for date ranges
  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today': return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday': return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case 'this-week': return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'last-week': return { start: startOfWeek(subDays(now, 7)), end: endOfWeek(subDays(now, 7)) };
      case 'this-month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case 'this-year': return { start: startOfYear(now), end: endOfYear(now) };
      case 'last-year': return { start: startOfYear(subMonths(now, 12)), end: endOfYear(subMonths(now, 12)) };
      case 'custom': return { start: startOfDay(new Date(customStart || now)), end: endOfDay(new Date(customEnd || now)) };
      default: return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const handleRunReport = async () => {
    if (!currentProperty || !activeReport) return;
    setLoading(true);
    setData(null);

    try {
      if (activeReport === 'revenue') {
        const { start, end } = getDateRange();
        const { data: pData } = await getPayments();
        const paymentsList = pData?.payments || [];
        
        // Filter by date range and tenantId
        const filtered = paymentsList.filter((p: any) => {
          const date = new Date(p.createdAt);
          return date >= start && date <= end;
        });
        setData(filtered);
      }
      else if (activeReport === 'booking') {
        const { start, end } = getDateRange();
        const { data: bData } = await getBookings({
          variables: { propertyId: currentProperty.id }
        });
        const bookingsList = bData?.bookings || [];
        
        // Filter by date range
        const filtered = bookingsList.filter((b: any) => {
          const date = new Date(b.createdAt);
          return date >= start && date <= end;
        });
        setData(filtered);
      }
      else if (activeReport === 'payments-due') {
        const { start, end } = getDateRange();
        const { data: bData } = await getBookings({
          variables: { propertyId: currentProperty.id }
        });
        const bookingsList = bData?.bookings || [];
        
        // Filter by date range and calculate due
        const filtered = bookingsList
          .filter((b: any) => {
            const date = new Date(b.createdAt);
            return date >= start && date <= end;
          })
          .map((b: any) => {
            const paidAmount = b.Payment?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
            const due = Number(b.totalAmount || 0) - paidAmount;
            return { ...b, paidAmount, due };
          })
          .filter((b: any) => b.due > 0);

        setData(filtered);
      }
      else if (activeReport === 'occupancy') {
        // Fetch rooms
        const { data: rData } = await getRooms({
          variables: { propertyId: currentProperty.id }
        });
        const roomsList = rData?.rooms || [];
        
        // Sort rooms by roomNumber asc
        const sortedRooms = [...roomsList].sort((a: any, b: any) => 
          a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
        );
        setRooms(sortedRooms);

        const start = startOfMonth(new Date(parseInt(occYear!), parseInt(occMonth!) - 1));
        const end = endOfMonth(start);

        // Fetch bookings for occupancy overlaps
        const { data: bData } = await getBookings({
          variables: { propertyId: currentProperty.id }
        });
        const bookingsList = bData?.bookings || [];

        // Filter bookings where checkInDate <= end AND checkOutDate >= start AND status !== 'CANCELLED'
        const filtered = bookingsList.filter((b: any) => {
          if (b.status === 'CANCELLED') return false;
          const checkIn = new Date(b.checkInDate);
          const checkOut = new Date(b.checkOutDate);
          return checkIn <= end && checkOut >= start;
        });

        setData(filtered);
      }
    } catch (err) {
      console.error('Report Generation Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: 'csv' | 'xlsx') => {
    if (!data || !activeReport) return;

    let exportData: any[] = [];
    let filename = `report_${activeReport}_${new Date().getTime()}`;

    if (activeReport === 'revenue') {
      const totalAmount = data.reduce((sum, p) => sum + Number(p.amount), 0);
      exportData = data.map(p => ({
        'Payment ID': p.id,
        'Person Name': p.Booking?.Guest?.name || 'N/A',
        'Email': p.Booking?.Guest?.email || 'N/A',
        'Phone': p.Booking?.Guest?.phone || 'N/A',
        'Amount': p.amount,
        'Payment Date': formatDate(new Date(p.createdAt), 'yyyy-MM-dd HH:mm'),
        'Booking ID': p.bookingId,
        'Payment Mode': p.method,
        'Notes': p.notes || ''
      }));
      exportData.push({
        'Payment ID': 'TOTAL',
        'Amount': totalAmount
      });
    } else if (activeReport === 'booking') {
      const totals = data.reduce((acc, b) => {
        acc.adults += b.adults || 0;
        acc.children += b.children || 0;
        acc.amount += Number(b.totalAmount) || 0;
        return acc;
      }, { adults: 0, children: 0, amount: 0 });

      exportData = data.map(b => ({
        'Booking ID': b.id,
        'Person Name': b.Guest?.name || 'N/A',
        'Email': b.Guest?.email || 'N/A',
        'Phone': b.Guest?.phone || 'N/A',
        'Adult Count': b.adults,
        'Children Count': b.children,
        'Rooms': b.BookingRoom?.map((br: any) => br.Room?.roomNumber).filter(Boolean).join(', ') || 'Unassigned',
        'Amount': b.totalAmount,
        'Booking Date': formatDate(new Date(b.createdAt), 'yyyy-MM-dd'),
        'Checkin Date': formatDate(new Date(b.checkInDate), 'yyyy-MM-dd'),
        'Checkout Date': formatDate(new Date(b.checkOutDate), 'yyyy-MM-dd')
      }));
      exportData.push({
        'Booking ID': 'TOTAL',
        'Adult Count': totals.adults,
        'Children Count': totals.children,
        'Amount': totals.amount
      });
    } else if (activeReport === 'payments-due') {
      const totals = data.reduce((acc, b) => {
        acc.amount += Number(b.totalAmount) || 0;
        acc.paid += Number(b.paidAmount) || 0;
        acc.due += Number(b.due) || 0;
        return acc;
      }, { amount: 0, paid: 0, due: 0 });

      exportData = data.map(b => ({
        'Booking ID': b.id,
        'Person Name': b.Guest?.name || 'N/A',
        'Email': b.Guest?.email || 'N/A',
        'Phone': b.Guest?.phone || 'N/A',
        'Amount': b.totalAmount,
        'Paid Amount': b.paidAmount,
        'Due': b.due
      }));
      exportData.push({
        'Booking ID': 'TOTAL',
        'Amount': totals.amount,
        'Paid Amount': totals.paid,
        'Due': totals.due
      });
    } else if (activeReport === 'occupancy') {
      const days = eachDayOfInterval({
        start: startOfMonth(new Date(parseInt(occYear!), parseInt(occMonth!) - 1)),
        end: endOfMonth(new Date(parseInt(occYear!), parseInt(occMonth!) - 1))
      });

      exportData = rooms.map(room => {
        const row: any = { 'Room Number': room.roomNumber };
        days.forEach(day => {
          const isOccupied = data.some(b => {
            const checkIn = startOfDay(new Date(b.checkInDate));
            const checkOut = startOfDay(new Date(b.checkOutDate));
            const d = startOfDay(day);
            const isAssigned = b.BookingRoom?.some((br: any) => br.roomId === room.id);
            return isAssigned && d >= checkIn && d < checkOut;
          });
          row[formatDate(day, 'dd')] = isOccupied ? 'Booked' : '-';
        });
        return row;
      });

      // Add summary row for occupancy
      const summaryRow: any = { 'Room Number': 'TOTAL' };
      days.forEach(day => {
        const count = rooms.filter(room => data.some(b => {
          const checkIn = startOfDay(new Date(b.checkInDate));
          const checkOut = startOfDay(new Date(b.checkOutDate));
          const d = startOfDay(day);
          const isAssigned = b.BookingRoom?.some((br: any) => br.roomId === room.id);
          return isAssigned && d >= checkIn && d < checkOut;
        })).length;
        summaryRow[formatDate(day, 'dd')] = count;
      });
      exportData.push(summaryRow);
    }

    const headers = Object.keys(exportData[0]).filter(h => h !== 'Room Number').sort((a, b) => parseInt(a) - parseInt(b));
    const worksheet = XLSX.utils.json_to_sheet(exportData, { header: ['Room Number', ...headers] });

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();
    } else {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      XLSX.writeFile(workbook, `${filename}.xlsx`);
    }
  };

  const renderFilterBar = () => {
    return (
      <div className="flex flex-wrap items-end gap-4 p-6 bg-white rounded-2xl border shadow-sm mb-8 transition-all hover:shadow-md">
        <div className="space-y-1.5 min-w-[200px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Report Type</label>
          <Select value={activeReport || ''} onValueChange={(val: ReportType | string | null) => {
            setData(null)
            setActiveReport(val as ReportType)
          }}>
            <SelectTrigger className="h-11 rounded-xl font-bold border-slate-200">
              <SelectValue placeholder="Select report..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="occupancy" className="font-bold">Occupancy Report</SelectItem>
              <SelectItem value="revenue" className="font-bold">Revenue Report</SelectItem>
              <SelectItem value="booking" className="font-bold">Booking Report</SelectItem>
              <SelectItem value="payments-due" className="font-bold">Payments Due Report</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {activeReport && activeReport !== 'occupancy' && (
          <div className="space-y-1.5 min-w-[180px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Time Period</label>
            <Select value={dateFilter} onValueChange={(val: DateFilter | null) => setDateFilter(val as DateFilter)}>
              <SelectTrigger className="h-11 rounded-xl font-bold border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today" className="font-medium">Today</SelectItem>
                <SelectItem value="yesterday" className="font-medium">Yesterday</SelectItem>
                <SelectItem value="this-week" className="font-medium">This Week</SelectItem>
                <SelectItem value="last-week" className="font-medium">Last Week</SelectItem>
                <SelectItem value="this-month" className="font-medium">This Month</SelectItem>
                <SelectItem value="last-month" className="font-medium">Last Month</SelectItem>
                <SelectItem value="this-year" className="font-medium">This Year</SelectItem>
                <SelectItem value="last-year" className="font-medium">Last Year</SelectItem>
                <SelectItem value="custom" className="font-medium">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {activeReport === 'occupancy' && (
          <>
            <div className="space-y-1.5 min-w-[120px]">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Month</label>
              <Select value={occMonth} onValueChange={setOccMonth}>
                <SelectTrigger className="h-11 rounded-xl font-bold border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>
                      {formatDate(new Date(2024, i, 1), 'MMMM')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[120px]">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Year</label>
              <Select value={occYear} onValueChange={setOccYear}>
                <SelectTrigger className="h-11 rounded-xl font-bold border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {dateFilter === 'custom' && activeReport !== 'occupancy' && (
          <div className="flex items-center gap-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">From</label>
              <input
                type="date"
                className="h-11 rounded-xl font-bold border border-slate-200 px-4 focus:ring-2 focus:ring-primary/20 outline-none"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">To</label>
              <input
                type="date"
                className="h-11 rounded-xl font-bold border border-slate-200 px-4 focus:ring-2 focus:ring-primary/20 outline-none"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
        )}

        <Button
          className="h-11 rounded-xl px-8 font-black uppercase tracking-tighter text-sm shadow-lg shadow-primary/20 transition-all active:scale-95"
          onClick={handleRunReport}
          disabled={loading || !activeReport}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2 fill-current" />}
          Run Report
        </Button>
      </div>
    );
  };

  const renderTable = () => {
    if (loading) return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );

    if (!data) return (
      <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50 border border-dashed rounded-3xl border-slate-200">
        <div className="p-4 rounded-full bg-slate-100 text-slate-400">
          <Search className="h-10 w-10" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Ready to analyze?</h3>
          <p className="text-slate-500 font-medium max-w-[300px] mx-auto mt-1">Select a report type and time period above to generate your property insights.</p>
        </div>
      </div>
    );

    if (data.length === 0) return (
      <div className="h-[300px] flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
        <Inbox className="h-12 w-12 text-slate-300" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No data found for the selected criteria</p>
      </div>
    );

    const reportTitle = {
      'revenue': 'Revenue Transactions',
      'booking': 'Booking Registry',
      'payments-due': 'Outstanding Payments',
      'occupancy': 'Occupancy Matrix'
    }[activeReport!];

    // Calculate totals for UI headers
    const totals = (() => {
      if (!data) return null;
      if (activeReport === 'revenue') {
        return { amount: data.reduce((sum, p) => sum + Number(p.amount), 0) };
      }
      if (activeReport === 'booking') {
        return data.reduce((acc, b) => {
          acc.adults += b.adults || 0;
          acc.children += b.children || 0;
          acc.amount += Number(b.totalAmount) || 0;
          return acc;
        }, { adults: 0, children: 0, amount: 0 });
      }
      if (activeReport === 'payments-due') {
        return data.reduce((acc, b) => {
          acc.amount += Number(b.totalAmount) || 0;
          acc.paid += Number(b.paidAmount) || 0;
          acc.due += Number(b.due) || 0;
          return acc;
        }, { amount: 0, paid: 0, due: 0 });
      }
      return null;
    })();

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{reportTitle}</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Found {data.length} records</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl font-bold h-10 border-slate-200" onClick={() => exportReport('csv')}>
              <FileText className="h-4 w-4 mr-2 text-slate-400" />
              CSV
            </Button>
            <Button variant="default" size="sm" className="rounded-xl font-bold h-10 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200" onClick={() => exportReport('xlsx')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
          <div className="max-w-full overflow-x-auto">
            {activeReport === 'revenue' && (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Payment ID</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Person Name</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Email</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Phone</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">
                      Amount
                      <div className="text-primary text-[9px] font-black mt-0.5">TOTAL: ₹{totals?.amount.toLocaleString()}</div>
                    </TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Payment Date</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Booking ID</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Mode</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((p) => (
                    <TableRow key={p.id} className="font-medium hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-bold text-slate-900">#{p.id.split('-')[0].toUpperCase()}</TableCell>
                      <TableCell>{p.Booking?.Guest?.name || 'N/A'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{p.Booking?.Guest?.email || 'N/A'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{p.Booking?.Guest?.phone || 'N/A'}</TableCell>
                      <TableCell className="font-black text-primary">₹{Number(p.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-500">{formatDate(new Date(p.createdAt), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-[10px] font-bold">#{p.bookingId?.split('-')[0].toUpperCase()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-md uppercase text-[9px] font-black border-slate-200 text-slate-600 bg-slate-50">
                          {p.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 max-w-[150px] truncate">{p.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {activeReport === 'booking' && (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Booking ID</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Person Name</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Email</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Phone</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">
                      Adults
                      <div className="text-primary text-[9px] font-black mt-0.5">TOTAL: {totals?.adults}</div>
                    </TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">
                      Children
                      <div className="text-primary text-[9px] font-black mt-0.5">TOTAL: {totals?.children}</div>
                    </TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Rooms</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">
                      Amount
                      <div className="text-primary text-[9px] font-black mt-0.5">TOTAL: ₹{totals?.amount.toLocaleString()}</div>
                    </TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Booking Date</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Checkin</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Checkout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((b) => (
                    <TableRow key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-black text-slate-900">#{b.id.split('-')[0].toUpperCase()}</TableCell>
                      <TableCell className="font-bold">{b.Guest?.name}</TableCell>
                      <TableCell className="text-xs text-slate-500">{b.Guest?.email || 'N/A'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{b.Guest?.phone || 'N/A'}</TableCell>
                      <TableCell className="font-bold">{b.adults}</TableCell>
                      <TableCell className="font-bold">{b.children}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {b.BookingRoom?.map((br: any, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 border-indigo-100">
                              {br.Room?.roomNumber || 'TBD'}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-black text-primary">₹{Number(b.totalAmount).toLocaleString()}</TableCell>
                      <TableCell className="text-[10px] font-bold text-slate-500">{formatDate(new Date(b.createdAt), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-900">{formatDate(new Date(b.checkInDate), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-900">{formatDate(new Date(b.checkOutDate), 'yyyy-MM-dd')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {activeReport === 'payments-due' && (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Booking ID</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Person Name</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Email</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Phone</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">
                      Amount
                      <div className="text-slate-500 text-[9px] font-black mt-0.5">TOTAL: ₹{totals?.amount.toLocaleString()}</div>
                    </TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">
                      Paid Amount
                      <div className="text-emerald-600 text-[9px] font-black mt-0.5">TOTAL: ₹{totals?.paid.toLocaleString()}</div>
                    </TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">
                      Due
                      <div className="text-red-600 text-[9px] font-black mt-0.5">TOTAL: ₹{totals?.due.toLocaleString()}</div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((b) => (
                    <TableRow key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-black text-slate-900">#{b.id.split('-')[0].toUpperCase()}</TableCell>
                      <TableCell className="font-bold">{b.Guest?.name}</TableCell>
                      <TableCell className="text-xs text-slate-500">{b.Guest?.email || 'N/A'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{b.Guest?.phone || 'N/A'}</TableCell>
                      <TableCell className="font-bold">₹{Number(b.totalAmount).toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-emerald-600">₹{Number(b.paidAmount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-red-50 text-red-600 border-red-100 font-black text-sm px-3 h-8 rounded-lg">
                          ₹{Number(b.due).toLocaleString()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {activeReport === 'occupancy' && (
              <div className="max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                <Table className="border-collapse min-w-[1000px]">
                  <TableHeader className="bg-slate-100/80 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-24 bg-slate-100 font-black text-slate-900 sticky left-0 z-20 border-r border-slate-200 uppercase tracking-tighter text-[10px]">Room No</TableHead>
                      {eachDayOfInterval({
                        start: startOfMonth(new Date(parseInt(occYear!), parseInt(occMonth!) - 1)),
                        end: endOfMonth(new Date(parseInt(occYear!), parseInt(occMonth!) - 1))
                      }).map(day => (
                        <TableHead key={day.toISOString()} className="text-center font-bold p-2 min-w-[36px] text-[11px]">
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{formatDate(day, 'EEE')}</div>
                          <div className="text-slate-900">{formatDate(day, 'dd')}</div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map(room => (
                      <TableRow key={room.id} className="hover:bg-slate-50/50">
                        <TableCell className="bg-slate-50/80 sticky left-0 z-10 border-r border-slate-100 font-black text-slate-700 text-[11px] shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                          {room.roomNumber}
                        </TableCell>
                        {eachDayOfInterval({
                          start: startOfMonth(new Date(parseInt(occYear!), parseInt(occMonth!) - 1)),
                          end: endOfMonth(new Date(parseInt(occYear!), parseInt(occMonth!) - 1))
                        }).map(day => {
                          const isOccupied = data.some(b => {
                            const checkIn = startOfDay(new Date(b.checkInDate));
                            const checkOut = startOfDay(new Date(b.checkOutDate));
                            const d = startOfDay(day);
                            const isAssigned = b.BookingRoom?.some((br: any) => br.roomId === room.id);
                            return isAssigned && d >= checkIn && d < checkOut;
                          });
                          return (
                            <TableCell key={day.toISOString()} className="p-0 border border-slate-50">
                              <div className={cn(
                                "h-10 w-full flex items-center justify-center transition-all duration-200",
                                isOccupied ? "bg-primary/5 text-primary" : "text-slate-100"
                              )}>
                                {isOccupied ? (
                                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                                    <span className="text-[8px] font-bold text-white uppercase">B</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] opacity-20">•</span>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                    {/* Summary Row */}
                    <TableRow className="bg-slate-900 text-white font-bold border-t-2 border-slate-800">
                      <TableCell className="sticky left-0 bg-slate-900 z-10 border-r border-slate-800 text-[10px] font-black uppercase tracking-widest p-4">
                        Daily Booked
                      </TableCell>
                      {eachDayOfInterval({
                        start: startOfMonth(new Date(parseInt(occYear!), parseInt(occMonth!) - 1)),
                        end: endOfMonth(new Date(parseInt(occYear!), parseInt(occMonth!) - 1))
                      }).map(day => {
                        const count = rooms.filter(room => data.some(b => {
                          const checkIn = startOfDay(new Date(b.checkInDate));
                          const checkOut = startOfDay(new Date(b.checkOutDate));
                          const d = startOfDay(day);
                          const isAssigned = b.BookingRoom?.some((br: any) => br.roomId === room.id);
                          return isAssigned && d >= checkIn && d < checkOut;
                        })).length;
                        return (
                          <TableCell key={day.toISOString()} className="text-center p-2 border-r border-slate-800">
                            <span className={cn(
                              "text-xs font-black",
                              count > 0 ? "text-primary" : "text-slate-600"
                            )}>
                              {count}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-10 space-y-8 max-w-7xl mx-auto bg-slate-50/30 min-h-screen">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-1">
            <Activity className="h-3 w-3" /> Property Reports
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Operational Hub</h1>
          <p className="text-slate-500 font-medium text-sm flex items-center gap-1.5">
            Generating intelligent insights for <span className="text-slate-900 font-bold">{currentProperty?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeReport && data && data.length > 0 && (
            <Badge variant="outline" className="h-10 px-4 rounded-xl border-slate-200 bg-white font-bold text-slate-600 shadow-sm">
              Generated at {formatDate(new Date(), 'HH:mm')}
            </Badge>
          )}
        </div>
      </header>

      <div className="relative">
        <AnimatePresence>
          {renderFilterBar()}
        </AnimatePresence>

        <div className="min-h-[500px]">
          {renderTable()}
        </div>
      </div>
    </div>
  );
}
