'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookingForm } from "@/components/bookings/booking-form";
import { BookingDetails } from "@/components/bookings/booking-details";

export default function BookingsPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const bookings = useLiveQuery(
    () => db.bookings.reverse().toArray(),
    []
  );

  const handleBookingClick = (booking: any) => {
    setSelectedBooking({
      ...booking,
      checkInDate: new Date(booking.checkInDate),
      checkOutDate: new Date(booking.checkOutDate)
    });
    setIsDetailsOpen(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">Manage your reservations and check-ins.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button className="rounded-full shadow-lg group">
              <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
              New Booking
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px] rounded-3xl premium-card backdrop-blur-xl bg-background/80">
            <DialogHeader>
              <DialogTitle className="text-2xl font-heading font-bold">New Booking</DialogTitle>
            </DialogHeader>
            <BookingForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by guest name or room..." 
            className="pl-10 bg-card premium-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="premium-card bg-card">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="grid gap-4">
        <AnimatePresence>
          {bookings?.map((booking, i) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleBookingClick(booking)}
            >
              <Card className="premium-card cursor-pointer overflow-hidden group">
                <CardContent className="p-0">
                  <div className="flex md:items-center p-4">
                    <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mr-4">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 grid md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Guest ID: {booking.guestId}</p>
                        <p className="text-xs text-muted-foreground">Property ID: {booking.propertyId}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {format(new Date(booking.checkInDate), 'MMM d')} - {format(new Date(booking.checkOutDate), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">Duration: 2 nights</p>
                      </div>
                      <div className="flex items-center">
                        <Badge variant="secondary" className={cn(
                          "font-normal",
                          booking.status === 'CONFIRMED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""
                        )}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-end font-bold text-lg">
                        ₹{booking.totalAmount?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {bookings?.length === 0 && (
          <div className="text-center py-20 bg-muted/30 rounded-2xl border-2 border-dashed border-muted/50">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No bookings found</h3>
            <p className="text-muted-foreground mb-6">Create a new booking to get started.</p>
            <Button variant="outline">Learn more</Button>
          </div>
        )}
      </div>
      <BookingDetails 
        open={isDetailsOpen} 
        onOpenChange={setIsDetailsOpen} 
        booking={selectedBooking} 
      />
    </div>
  );
}

// Helper utility for cn
import { cn } from "@/lib/utils";
