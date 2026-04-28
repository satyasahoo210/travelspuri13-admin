'use client';

import { CalendarGrid } from '@/components/calendar/calendar-grid';
import { useProperty } from '@/components/providers/property-provider';
import { Button } from '@/components/ui/button';
import { Tables } from '@/database.types';
import { createClient } from '@/lib/utils/supabase/client';
import { addDays, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, Filter, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type RoomResp = Tables<'Room'> & {
  RoomType: Tables<'RoomType'>;
}

export type BookingAssignment = Tables<'BookingRoom'> & {
  Booking: Tables<'Booking'> & {
    Guest: Pick<Tables<'Guest'>, 'name' | 'phone'>;
  }
}

export default function CalendarPage() {
  const supabase = createClient();
  const { currentProperty } = useProperty();
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [rooms, setRooms] = useState<RoomResp[] | null>(null);
  const [assignments, setAssignments] = useState<BookingAssignment[] | null>(null);
  const [fetching, setFetching] = useState(false);
  

  useEffect(() => {
    const fetchData = async () => {
      if (!currentProperty?.id) return;
      
      setFetching(true);
      try {
        const [roomsRes, assignmentsRes] = await Promise.all([
          supabase
            .from('Room')
            .select('*, RoomType!inner(*)')
            .eq('RoomType.propertyId', currentProperty.id)
            .order('roomNumber'),
          supabase
            .from('BookingRoom')
            .select('*, Booking!inner(*, Guest(name, phone))')
            .not('roomId', 'is', null) // Only fetch specific assignments
            .eq('Booking.propertyId', currentProperty.id)
        ]);

        if (roomsRes.data) setRooms(roomsRes.data);
        if (assignmentsRes.data) setAssignments(assignmentsRes.data as any);
      } catch (err) {
        console.error('Error fetching calendar data:', err);
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  }, [currentProperty?.id, supabase]);

  const handlePrev = () => setStartDate(prev => addDays(prev, -7));
  const handleNext = () => setStartDate(prev => addDays(prev, 7));
  const handleToday = () => setStartDate(startOfDay(new Date()));

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-heading font-extrabold tracking-tight">Occupancy Grid</h2>
          <p className="text-muted-foreground text-sm">Real-time room availability and reservation timeline.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <Button variant="ghost" size="icon" onClick={handlePrev} className="rounded-xl hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToday} className="px-4 font-bold text-xs uppercase tracking-widest hover:bg-primary/5 hover:text-primary">
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNext} className="rounded-xl hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
           <Button variant="outline" className="rounded-xl border-slate-200 shadow-sm hover:bg-slate-50">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" className="rounded-xl border-slate-200 shadow-sm hover:bg-slate-50">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </header>

      {rooms && assignments && !fetching ? (
        <CalendarGrid rooms={rooms} bookings={assignments} startDate={startDate} />
      ) : (
        <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <div className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
            Optimizing Grid View...
          </div>
        </div>
      )}
    </div>
  );
}
