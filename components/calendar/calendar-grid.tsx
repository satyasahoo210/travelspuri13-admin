'use client';

import { useState, useMemo } from 'react';
import { format, addDays, startOfDay, eachDayOfInterval, isSameDay, differenceInDays } from 'date-fns';
import { Room, Booking } from '@/lib/db/dexie';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface CalendarGridProps {
  rooms: Room[];
  bookings: Booking[];
  startDate?: Date;
}

export function CalendarGrid({ rooms, bookings, startDate = startOfDay(new Date()) }: CalendarGridProps) {
  const [viewDays] = useState(7);
  
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startDate,
      end: addDays(startDate, viewDays - 1),
    });
  }, [startDate, viewDays]);

  return (
    <div className="flex flex-col border rounded-3xl premium-card overflow-hidden bg-background/50 backdrop-blur-xl">
      {/* Header */}
      <div className="flex border-b bg-muted/30">
        <div className="w-32 shrink-0 p-4 border-r font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center justify-center">
          Rooms
        </div>
        <div className="flex-1 grid grid-cols-7">
          {days.map((day) => (
            <div key={day.toString()} className="p-4 text-center border-r last:border-r-0">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">{format(day, 'EEE')}</p>
              <p className="text-xl font-extrabold tracking-tight">{format(day, 'dd')}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{format(day, 'MMM')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="overflow-y-auto max-h-[600px]">
        {rooms.map((room) => (
          <div key={room.id} className="flex border-b last:border-b-0 group">
            {/* Room Info */}
            <div className="w-32 shrink-0 p-4 border-r bg-muted/10 flex flex-col items-center justify-center group-hover:bg-primary/5 transition-colors">
              <p className="text-lg font-extrabold text-primary">{room.roomNumber}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{room.roomTypeId}</p>
              <Badge 
                variant="outline" 
                className={cn(
                  "mt-2 text-[8px] h-4 scale-90",
                  room.housekeepingStatus === 'READY' ? "text-emerald-600 border-emerald-200" : "text-amber-600 border-amber-200"
                )}
              >
                {room.housekeepingStatus}
              </Badge>
            </div>

            {/* Timeline */}
            <div className="flex-1 grid grid-cols-7 relative h-24">
              {days.map((day) => (
                <div key={day.toString()} className="border-r last:border-r-0 bg-transparent transition-colors group-hover:bg-muted/5" />
              ))}

              {/* Bookings on this room */}
              <div className="absolute inset-0 pointer-events-none">
                {bookings
                  .filter((b) => b.roomTypeId === room.roomTypeId) // Simple mock mapping for now
                  .map((booking) => {
                    const checkIn = startOfDay(new Date(booking.checkInDate));
                    const checkOut = startOfDay(new Date(booking.checkOutDate));
                    
                    // Check if booking overlaps with current view
                    if (checkOut <= startDate || checkIn >= addDays(startDate, viewDays)) return null;

                    const startOffset = Math.max(0, differenceInDays(checkIn, startDate));
                    const durationInView = differenceInDays(
                      new Date(Math.min(checkOut.getTime(), addDays(startDate, viewDays).getTime())),
                      new Date(Math.max(checkIn.getTime(), startDate.getTime()))
                    );

                    if (durationInView <= 0) return null;

                    return (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-4 pointer-events-auto cursor-pointer"
                        style={{
                          left: `${(startOffset / 7) * 100}%`,
                          width: `${(durationInView / 7) * 100}%`,
                          height: '48px',
                        }}
                      >
                        <div className={cn(
                          "h-full mx-1 rounded-xl p-2 flex flex-col justify-center border shadow-sm transition-all hover:shadow-md hover:scale-[1.02]",
                          booking.status === 'CONFIRMED' ? "bg-emerald-50 border-emerald-200 text-emerald-900" :
                          booking.status === 'CHECKED_IN' ? "bg-primary/10 border-primary/20 text-primary-900" :
                          "bg-secondary border-secondary-foreground/10"
                        )}>
                          <p className="text-[10px] font-bold truncate">GUEST-{booking.guestId.slice(-4)}</p>
                          <p className="text-[8px] opacity-70 truncate font-mono uppercase font-bold">
                            {format(checkIn, 'dd')} - {format(checkOut, 'dd')}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
