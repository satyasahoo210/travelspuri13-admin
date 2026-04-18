'use client';

import { useState } from 'react';
import { db } from '@/lib/db/dexie';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { format } from 'date-fns';

export function BookingForm({ onSuccess }: { onSuccess?: () => void }) {
  const [formData, setFormData] = useState({
    guestName: '',
    checkIn: '',
    checkOut: '',
    roomType: 'standard',
    amount: '0',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create Guest first or link to existing
    const guestId = `g_${Date.now()}`;
    await db.guests.put({
      id: guestId,
      name: formData.guestName,
      updatedAt: Date.now(),
    });

    // Create Booking
    const bookingId = `b_${Date.now()}`;
    const newBooking = {
      id: bookingId,
      guestId,
      propertyId: 'p1', // Dynamic later
      tenantId: 't1',
      checkInDate: new Date(formData.checkIn),
      checkOutDate: new Date(formData.checkOut),
      status: 'CONFIRMED' as const,
      source: 'DIRECT' as const,
      roomTypeId: formData.roomType,
      totalAmount: parseFloat(formData.amount),
      synced: 0 as const,
      updatedAt: Date.now(),
    };

    await db.bookings.put(newBooking);

    // Add to Sync Queue
    await db.syncQueue.add({
      entity: 'bookings',
      entityId: bookingId,
      action: 'create',
      data: newBooking,
      timestamp: Date.now(),
    });

    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="guestName">Guest Name</Label>
        <Input 
          id="guestName" 
          placeholder="e.g. John Doe" 
          required 
          value={formData.guestName}
          onChange={e => setFormData({...formData, guestName: e.target.value})}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="checkIn">Check-in</Label>
          <Input 
            id="checkIn" 
            type="date" 
            required 
            value={formData.checkIn}
            onChange={e => setFormData({...formData, checkIn: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="checkOut">Check-out</Label>
          <Input 
            id="checkOut" 
            type="date" 
            required 
            value={formData.checkOut}
            onChange={e => setFormData({...formData, checkOut: e.target.value})}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Total Amount (₹)</Label>
        <Input 
          id="amount" 
          type="number" 
          required 
          value={formData.amount}
          onChange={e => setFormData({...formData, amount: e.target.value})}
        />
      </div>

      <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">
        Create Booking
      </Button>
    </form>
  );
}
