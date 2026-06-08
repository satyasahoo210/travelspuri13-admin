'use client';

import { CalendarGrid } from '@/components/calendar/calendar-grid';
import { useProperty } from '@/components/providers/property-provider';
import { Button } from '@/components/ui/button';
import { addDays, differenceInDays, format, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { gql, TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

interface RoomResp {
  id: string;
  roomNumber: string;
  status: string;
  roomTypeId: string;
  RoomType: {
    id: string;
    name: string;
    defaultPrice?: number | null;
  };
}

export interface BookingAssignment {
  id: string;
  bookingId: string;
  roomId?: string | null;
  roomTypeId: string;
  priceOverride?: number | null;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  Room?: {
    id: string;
    roomNumber: string;
  } | null;
  Booking: {
    id: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    source?: string | null;
    adults: number;
    children: number;
    notes?: string | null;
    Guest: {
      id: string;
      name: string;
      phone?: string | null;
    };
    Property: {
      id: string;
      timezone?: string | null;
    };
  };
}

interface GetCalendarDataResponse {
  rooms: RoomResp[];
  bookingRooms: BookingAssignment[];
}

const GET_CALENDAR_DATA: TypedDocumentNode<GetCalendarDataResponse, { propertyId: string }> = gql`
  query GetCalendarData($propertyId: String!) {
    rooms(propertyId: $propertyId) {
      id
      roomNumber
      status
      roomTypeId
      RoomType {
        id
        name
        defaultPrice
      }
    }
    bookingRooms(propertyId: $propertyId) {
      id
      bookingId
      roomId
      roomTypeId
      priceOverride
      status
      checkInDate
      checkOutDate
      Room {
        id
        roomNumber
      }
      Booking {
        id
        checkInDate
        checkOutDate
        status
        source
        adults
        children
        notes
        Guest {
          id
          name
          phone
        }
        Property {
          id
          timezone
        }
      }
    }
  }
`;

export default function CalendarPage() {
  const { currentProperty } = useProperty();
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const { data, loading: fetching } = useQuery(GET_CALENDAR_DATA, {
    variables: { propertyId: currentProperty?.id || '' },
    skip: !currentProperty?.id,
  });

  const rooms = useMemo(() => {
    if (!data?.rooms) return null;
    const sorted = [...data.rooms];
    sorted.sort((a, b) =>
      a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }),
    );
    return sorted;
  }, [data]);

  const assignments = data?.bookingRooms || null;

  const handlePrev = () => setStartDate((prev) => addDays(prev, -7));
  const handleNext = () => setStartDate((prev) => addDays(prev, 7));
  const handleToday = () => setStartDate(startOfDay(new Date()));

  const handleExport = () => {
    if (!assignments) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Guest Name,Phone,Room,Check-In,Check-Out,Total Days,Status\n' +
      assignments
        .map(
          (a) =>
            `"${a.Booking.Guest.name}","${a.Booking.Guest.phone || ''}","${a.Room?.roomNumber || a.roomId}","${toZonedTime(a.checkInDate || a.Booking.checkInDate, a.Booking.Property.timezone || 'UTC')}","${toZonedTime(a.checkOutDate || a.Booking.checkOutDate, a.Booking.Property.timezone || 'UTC')}","${differenceInDays(new Date(a.checkOutDate || a.Booking.checkOutDate), new Date(a.checkInDate || a.Booking.checkInDate))}","${a.status || a.Booking.status}"`,
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `bookings_${format(new Date(), 'yyyy-MM-dd')}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    return assignments.filter(
      (a) =>
        filterStatus === 'ALL' ||
        (a.status || a.Booking.status) === filterStatus,
    );
  }, [assignments, filterStatus]);

  return (
    <div className="p-4 md:p-8 max-w-400 mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-heading font-extrabold tracking-tight">
            Occupancy Grid
          </h2>
          <p className="text-muted-foreground text-sm">
            Real-time room availability and reservation timeline.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="rounded-xl hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
            className="px-4 font-bold text-xs uppercase tracking-widest hover:bg-primary/5 hover:text-primary"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="rounded-xl hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex items-center border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white h-11">
            <div className="px-3 text-slate-400">
              <Filter className="h-4 w-4" />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-[11px] px-3 outline-none font-black uppercase tracking-widest text-slate-700 pr-6 appearance-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            className="rounded-2xl border-slate-200 shadow-sm hover:bg-slate-50 h-11 px-6 font-black text-[11px] uppercase tracking-widest"
          >
            <Download className="mr-2 h-4 w-4 text-primary" />
            Export CSV
          </Button>
        </div>
      </header>

      {rooms && assignments && !fetching ? (
        <CalendarGrid
          rooms={rooms}
          bookings={filteredAssignments}
          startDate={startDate}
        />
      ) : (
        <div className="h-125 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <div className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
            Optimizing Grid View...
          </div>
        </div>
      )}
    </div>
  );
}
