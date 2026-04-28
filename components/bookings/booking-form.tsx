'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { useProperty } from '@/components/providers/property-provider';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from '@/lib/utils/supabase/client';
import { Calendar, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function BookingForm({ onSuccess }: { onSuccess?: () => void }) {
  const supabase = createClient();
  const { user } = useAuth();
  const { currentProperty } = useProperty();
  
  const [loading, setLoading] = useState(false);
  const [guests, setGuests] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    guestId: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    amount: '0',
    adults: '1',
    children: '0',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!currentProperty?.id) return;
      
      const { data: guestData } = await supabase.from('Guest').select('id, name').order('name');
      const { data: roomData } = await supabase
        .from('Room')
        .select('id, roomNumber, roomTypeId, RoomType!inner(propertyId)')
        .eq('RoomType.propertyId', currentProperty.id)
        .eq('status', 'AVAILABLE');

      if (guestData) setGuests(guestData);
      if (roomData) setRooms(roomData);
    };

    fetchData();
  }, [currentProperty?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId || !currentProperty?.id) return;
    
    setLoading(true);
    try {
      // 1. Create the Master Booking (Folio)
      const { data: booking, error: bError } = await supabase
        .from('Booking')
        .insert([{
          guestId: formData.guestId,
          propertyId: currentProperty.id,
          tenantId: user.tenantId,
          checkInDate: new Date(formData.checkIn).toISOString(),
          checkOutDate: new Date(formData.checkOut).toISOString(),
          adults: parseInt(formData.adults),
          children: parseInt(formData.children),
          totalAmount: parseFloat(formData.amount),
          status: 'CONFIRMED'
        }])
        .select()
        .single();

      if (bError) throw bError;

      // 2. Create the Relational Room Assignment (BookingRoom)
      const selectedRoom = rooms.find(r => r.id === formData.roomId);
      const { error: brError } = await supabase
        .from('BookingRoom')
        .insert([{
          bookingId: booking.id,
          roomId: formData.roomId,
          roomTypeId: selectedRoom.roomTypeId,
          status: 'CONFIRMED'
        }]);

      if (brError) throw brError;

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error creating booking:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Select Guest</Label>
        <Select value={formData.guestId} onValueChange={(v) => setFormData({...formData, guestId: v as string})} required>
          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
            <SelectValue placeholder="Search Guest..." />
          </SelectTrigger>
          <SelectContent>
            {guests.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Assign Room</Label>
        <Select value={formData.roomId} onValueChange={(v) => setFormData({...formData, roomId: v as string})} required>
          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
            <SelectValue placeholder="Select available room" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map(r => <SelectItem key={r.id} value={r.id}>Room {r.roomNumber}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Check-in</Label>
          <Input 
            type="date" 
            required 
            className="h-12 rounded-xl"
            value={formData.checkIn}
            onChange={e => setFormData({...formData, checkIn: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>Check-out</Label>
          <Input 
            type="date" 
            required 
            className="h-12 rounded-xl"
            value={formData.checkOut}
            onChange={e => setFormData({...formData, checkOut: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Adults</Label>
          <Input 
            type="number" 
            required 
            className="h-12 rounded-xl"
            value={formData.adults}
            onChange={e => setFormData({...formData, adults: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label>Children</Label>
          <Input 
            type="number" 
            required 
            className="h-12 rounded-xl"
            value={formData.children}
            onChange={e => setFormData({...formData, children: e.target.value})}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Expected Amount (₹)</Label>
        <Input 
          type="number" 
          required 
          className="h-12 rounded-xl font-bold text-primary"
          value={formData.amount}
          onChange={e => setFormData({...formData, amount: e.target.value})}
        />
      </div>

      <Button 
        type="submit" 
        disabled={loading}
        className="w-full h-14 rounded-2xl text-lg font-heading font-black tracking-tighter shadow-xl shadow-primary/20"
      >
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "CREATE RESERVATION"}
      </Button>
    </form>
  );
}
