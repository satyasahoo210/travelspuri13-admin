'use client';

import { useState, useEffect } from 'react';
import { useProperty } from '@/components/providers/property-provider';
import { db, RoomType, Room } from '@/lib/db/dexie';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BedDouble, Users, Plus, Save, TrendingUp } from 'lucide-react';
import { format, addDays, startOfDay, isWithinInterval } from 'date-fns';
import { motion } from 'framer-motion';

export default function InventoryPage() {
  const { currentProperty } = useProperty();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentProperty) return;

    const loadData = async () => {
      const rt = await db.roomTypes.where('propertyId').equals(currentProperty.id).toArray();
      const r = await db.rooms.toArray(); // Filtered by type later
      const b = await db.bookings.where('propertyId').equals(currentProperty.id).toArray();
      
      setRoomTypes(rt);
      setRooms(r);
      setBookings(b);
      setIsLoading(false);
    };

    loadData();
  }, [currentProperty]);

  const days = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));

  const getAvailability = (roomTypeId: string, date: Date) => {
    const totalRooms = rooms.filter(r => r.roomTypeId === roomTypeId).length;
    const occupiedOnDay = bookings.filter(b => {
      return b.roomTypeId === roomTypeId && 
             b.status !== 'CANCELLED' &&
             isWithinInterval(startOfDay(date), {
               start: startOfDay(new Date(b.checkInDate)),
               end: startOfDay(addDays(new Date(b.checkOutDate), -1))
             });
    }).length;

    return totalRooms - occupiedOnDay;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory & Types</h1>
          <p className="text-muted-foreground">Manage your room products, pricing, and live availability.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Room Type
        </Button>
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
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  High Demand Likely
                </Badge>
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
                          <div className="text-[10px] text-muted-foreground">Base: ₹{type.baseRate.toLocaleString()}</div>
                        </td>
                        {days.map(day => {
                          const avail = getAvailability(type.id, day);
                          const total = rooms.filter(r => r.roomTypeId === type.id).length;
                          const ratio = avail / total;
                          
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
                      <Badge variant="secondary">₹{type.baseRate}/night</Badge>
                    </div>
                    <CardTitle className="mt-4">{type.name}</CardTitle>
                    <CardDescription>{type.description || 'Standard luxury room'}</CardDescription>
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
                          defaultValue={type.baseRate}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button variant="outline" size="sm" className="w-full text-xs">Update Details</Button>
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

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
