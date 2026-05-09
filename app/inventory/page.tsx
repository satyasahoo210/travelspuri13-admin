'use client';

import { useProperty } from '@/components/providers/property-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tables } from '@/database.types';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/utils/supabase/client';
import { addDays, format, isWithinInterval, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import { BedDouble, Loader2, Plus, Save, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

type RoomType = Tables<'RoomType'>;
type Room = Tables<'Room'> & {
  RoomType: Tables<'RoomType'>;
};
type Booking = Tables<'Booking'> & {
  BookingRoom: Tables<'BookingRoom'>[];
};

export default function InventoryPage() {
  const { currentProperty } = useProperty();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    capacity: 2,
    defaultPrice: 0,
    description: ''
  });

  const loadData = async () => {
    if (!currentProperty) return;
    setIsLoading(true);
    
    try {
      const [rtRes, rRes, bRes] = await Promise.all([
        supabase.from('RoomType').select('*').eq('propertyId', currentProperty.id),
        supabase.from('Room').select('*, RoomType!inner(*)').eq('RoomType.propertyId', currentProperty.id),
        supabase.from('Booking').select('*, BookingRoom(*, Room(*))').eq('propertyId', currentProperty.id).neq('status', 'CANCELLED')
      ]);

      if (rtRes.data) setRoomTypes(rtRes.data as RoomType[]);
      if (rRes.data) setRooms(rRes.data as Room[]);
      if (bRes.data) setBookings(bRes.data);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProperty]);

  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProperty) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('RoomType').insert({
        propertyId: currentProperty.id,
        name: formData.name,
        capacity: formData.capacity,
        defaultPrice: formData.defaultPrice,
      });

      if (error) throw error;

      await loadData();
      setFormData({ name: '', capacity: 2, defaultPrice: 0, description: '' });
      setIsAddOpen(false);
    } catch (error) {
      console.error('Failed to add room type:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));

  const getAvailability = (roomTypeId: string, date: Date) => {
    const totalRooms = rooms.filter(r => r.roomTypeId === roomTypeId).length;
    let occupiedOnDay = 0;

    bookings.forEach(b => {
      const isOccupied = isWithinInterval(startOfDay(date), {
        start: startOfDay(new Date(b.checkInDate)),
        end: startOfDay(addDays(new Date(b.checkOutDate), -1))
      });

      if (isOccupied) {
        // Count how many rooms of this type are in this booking
        const roomsOfTypeInBooking = (b.BookingRoom || []).filter((br: any) => 
          br.Room?.roomTypeId === roomTypeId
        ).length;
        occupiedOnDay += roomsOfTypeInBooking;
      }
    });

    return totalRooms - occupiedOnDay;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory & Types</h1>
          <p className="text-muted-foreground">Manage your room products, pricing, and live availability.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger
            render={
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Room Type
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddRoomType}>
              <DialogHeader>
                <DialogTitle>Add Room Type</DialogTitle>
                <DialogDescription>
                  Create a new category of rooms for your property.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Deluxe Suite" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input 
                      id="capacity" 
                      type="number" 
                      min="1"
                      required
                      value={formData.capacity}
                      onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rate">Base Rate (₹)</Label>
                    <Input 
                      id="rate" 
                      type="number" 
                      min="0"
                      required
                      value={formData.defaultPrice}
                      onChange={e => setFormData({...formData, defaultPrice: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description" 
                    placeholder="Room specifics..." 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Room Type
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="grid">Availability Grid</TabsTrigger>
          <TabsTrigger value="types">Room Configurations</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-6 space-y-4">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>14-Day Availability</CardTitle>
                <CardDescription>Real-time room blocks by category</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3 text-left font-medium text-muted-foreground border-b min-w-[180px]">Room Type</th>
                      {days.map(day => (
                        <th key={day.toISOString()} className="p-3 text-center border-b min-w-[60px]">
                          <div className="text-[10px] uppercase text-muted-foreground">{format(day, 'EEE')}</div>
                          <div className="text-sm font-bold">{format(day, 'dd')}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypes.map(type => (
                      <tr key={type.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 border-b">
                          <div className="font-bold text-sm">{type.name}</div>
                          <div className="text-[10px] text-muted-foreground">Base: ₹{Number(type.defaultPrice).toLocaleString()}</div>
                        </td>
                        {days.map(day => {
                          const avail = getAvailability(type.id, day);
                          const total = rooms.filter(r => r.roomTypeId === type.id).length;
                          
                          return (
                            <td key={day.toISOString()} className="p-3 border-b text-center">
                              <div className={cn(
                                "w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                                avail <= 0 
                                  ? "bg-destructive/10 text-destructive border border-destructive/20" 
                                  : avail <= 2
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-green-500/10 text-green-600 border border-green-500/20"
                              )}>
                                {avail}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roomTypes.map((type) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow group">
                  <div className="h-2 bg-primary/20 group-hover:bg-primary transition-colors" />
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <BedDouble className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary">₹{Number(type.defaultPrice)}/night</Badge>
                    </div>
                    <CardTitle className="mt-4">{type.name}</CardTitle>
                    <CardDescription>{(type as any).description || 'Standard luxury room'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Max {type.capacity} Guests
                      </div>
                      <div className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        {rooms.filter(r => r.roomTypeId === type.id).length} Units
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`rate-${type.id}`} className="text-[10px] uppercase font-bold text-muted-foreground">Adjust Base Rate</Label>
                        <Input 
                          id={`rate-${type.id}`}
                          defaultValue={Number(type.defaultPrice)}
                          className="h-8 text-sm"
                          readOnly
                          disabled
                        />
                      </div>
                      {/* <Button variant="outline" size="sm" className="w-full text-xs">Update Details</Button> */}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
