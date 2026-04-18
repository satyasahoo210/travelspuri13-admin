'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import { CalendarGrid } from '@/components/calendar/calendar-grid';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Filter, Download } from 'lucide-react';
import { useState } from 'react';
import { addDays, startOfDay } from 'date-fns';

export default function CalendarPage() {
  const [startDate, setStartDate] = useState(startOfDay(new Date()));

  const rooms = useLiveQuery(() => db.rooms.toArray(), []);
  const bookings = useLiveQuery(() => db.bookings.toArray(), []);

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

        <div className="flex items-center gap-3 bg-card premium-card p-1.5 rounded-2xl border">
          <Button variant="ghost" size="icon" onClick={handlePrev} className="rounded-xl">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToday} className="px-4 font-bold text-xs uppercase tracking-widest hover:bg-primary/5 hover:text-primary">
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNext} className="rounded-xl">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
           <Button variant="outline" className="premium-card rounded-xl">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" className="premium-card rounded-xl">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </header>

      {rooms && bookings ? (
        <CalendarGrid rooms={rooms} bookings={bookings} startDate={startDate} />
      ) : (
        <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-3xl border-2 border-dashed">
          <div className="animate-pulse text-muted-foreground font-medium uppercase tracking-widest text-xs">
            Optimizing Grid View...
          </div>
        </div>
      )}
    </div>
  );
}
