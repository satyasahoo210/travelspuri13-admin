'use client';

import { useProperty } from '@/components/providers/property-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/utils/supabase/client';
import { addDays, format, isWithinInterval, startOfDay } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { BedDouble, Calendar, Info, Loader2, Plus, Save, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { gql, TypedDocumentNode } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';

interface RoomType {
  id: string;
  name: string;
  capacity: number;
  defaultPrice?: number | null;
  propertyId: string;
  description?: string | null;
}

interface Room {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  status: string;
  housekeepingStatus: string;
  priorityCleaning: boolean;
  RoomType?: RoomType | null;
}

interface BookingRoom {
  id: string;
  roomId?: string | null;
  roomTypeId: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
}

interface Booking {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalAmount?: number | null;
  BookingRoom?: BookingRoom[] | null;
}

interface InventoryQueryResponse {
  roomTypes: RoomType[];
  rooms: Room[];
  bookings: Booking[];
}

const GET_INVENTORY_DATA: TypedDocumentNode<InventoryQueryResponse, { propertyId: string }> = gql`
  query GetInventoryData($propertyId: String!) {
    roomTypes(propertyId: $propertyId) {
      id
      name
      capacity
      defaultPrice
      propertyId
    }
    rooms(propertyId: $propertyId) {
      id
      roomNumber
      roomTypeId
      status
      housekeepingStatus
      priorityCleaning
      RoomType {
        id
        name
        capacity
        defaultPrice
      }
    }
    bookings(propertyId: $propertyId) {
      id
      checkInDate
      checkOutDate
      status
      totalAmount
      BookingRoom {
        id
        roomId
        roomTypeId
        status
        checkInDate
        checkOutDate
      }
    }
  }
`;

const CREATE_ROOM_TYPE: TypedDocumentNode<{ createRoomType: RoomType }, { input: any }> = gql`
  mutation CreateRoomType($input: CreateRoomTypeInput!) {
    createRoomType(input: $input) {
      id
      name
      capacity
      defaultPrice
      propertyId
    }
  }
`;

export default function InventoryPage() {
  const { currentProperty } = useProperty();
  const supabase = createClient();

  const { data, loading, refetch } = useQuery(GET_INVENTORY_DATA, {
    variables: { propertyId: currentProperty?.id || '' },
    skip: !currentProperty?.id,
  });

  const [createRoomType] = useMutation(CREATE_ROOM_TYPE);

  // Date Range State
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 13), 'yyyy-MM-dd'));

  // Refs for scroll synchronization
  const leftTableRef = useRef<HTMLTableSectionElement>(null);
  const rightTableRef = useRef<HTMLTableSectionElement>(null);

  const handleLeftScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (rightTableRef.current && rightTableRef.current.scrollTop !== target.scrollTop) {
      rightTableRef.current.scrollTop = target.scrollTop;
    }
  };

  const handleRightScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (leftTableRef.current && leftTableRef.current.scrollTop !== target.scrollTop) {
      leftTableRef.current.scrollTop = target.scrollTop;
    }
  };

  // Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGridExpanded, setIsGridExpanded] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    capacity: 2,
    defaultPrice: 0,
    description: ''
  });

  const roomTypes = data?.roomTypes || [];
  const rooms = data?.rooms || [];
  const bookings = useMemo(() => {
    const rawBookings = data?.bookings || [];
    return rawBookings.filter((b) => b.status !== 'CANCELLED');
  }, [data]);

  useEffect(() => {
    // Subscribe to real-time updates for bookings and rooms
    if (currentProperty) {
      const channel = supabase
        .channel('inventory-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Booking', filter: `propertyId=eq.${currentProperty.id}` }, () => refetch())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'BookingRoom' }, () => refetch())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Room' }, () => refetch())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentProperty, refetch]);

  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProperty) return;

    setIsSubmitting(true);
    try {
      await createRoomType({
        variables: {
          input: {
            propertyId: currentProperty.id,
            name: formData.name,
            capacity: Number(formData.capacity),
            defaultPrice: Number(formData.defaultPrice),
          }
        }
      });

      await refetch();
      setFormData({ name: '', capacity: 2, defaultPrice: 0, description: '' });
      setIsAddOpen(false);
    } catch (error) {
      console.error('Failed to add room type:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = useMemo(() => {
    if (!startDate || !endDate) return [];
    const start = startOfDay(new Date(startDate));
    const end = startOfDay(new Date(endDate));
    if (end < start) return [];

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const count = Math.min(diffDays + 1, 31);
    return Array.from({ length: count }).map((_, i) => addDays(start, i));
  }, [startDate, endDate]);

  const getAvailability = (roomTypeId: string, date: Date) => {
    const totalRooms = rooms.filter(r => r.roomTypeId === roomTypeId).length;
    let occupiedOnDay = 0;

    bookings.forEach(b => {
      const isOccupied = isWithinInterval(startOfDay(date), {
        start: startOfDay(new Date(b.checkInDate)),
        end: startOfDay(addDays(new Date(b.checkOutDate), -1))
      });

      if (isOccupied) {
        const roomsOfTypeInBooking = (b.BookingRoom || []).filter((br: any) =>
          br.roomTypeId === roomTypeId
        ).length;
        occupiedOnDay += roomsOfTypeInBooking;
      }
    });

    return Math.max(0, totalRooms - occupiedOnDay);
  };

  if (loading && !data) return (
    <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Synchronizing Inventory...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-10 w-full max-w-full overflow-x-hidden">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Inventory Grid</h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Info className="h-4 w-4" /> Manage your room products and real-time availability.
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="w-full md:w-auto h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[11px] gap-3" />
          }>
            <Plus className="h-5 w-5" /> Add Room Type
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-[450px] rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-900 p-8 text-white">
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">Create Room Type</DialogTitle>
              <DialogDescription className="text-white/60 font-medium">Define a new category of rooms for your property.</DialogDescription>
            </div>
            <form onSubmit={handleAddRoomType} className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category Name</Label>
                <Input
                  placeholder="e.g. Executive Suite"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 rounded-xl border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Max Capacity</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 2 })}
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Base Price (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={formData.defaultPrice}
                    onChange={e => setFormData({ ...formData, defaultPrice: parseFloat(e.target.value) || 0 })}
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAddOpen(false)}
                  className="h-12 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Category'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Tabs defaultValue="grid" className="space-y-8">
        <TabsList className="bg-slate-100 rounded-2xl p-1 w-fit border border-slate-200/50">
          <TabsTrigger value="grid" className="rounded-xl px-6 py-2.5 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            Availability Grid
          </TabsTrigger>
          <TabsTrigger value="types" className="rounded-xl px-6 py-2.5 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            Categories ({roomTypes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-8 mt-0">
          {/* Date Range Picker */}
          <div className="p-6 bg-white rounded-3xl border shadow-sm flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">
              Showing availability for {days.length} days
            </p>
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
            <CardContent className="p-0">
              <div className="flex w-full overflow-hidden">
                {/* Fixed Column - Room Type Name */}
                <div className="w-56 md:w-64 flex-shrink-0 bg-white border-r border-slate-100">
                  <div className="h-[70px] bg-slate-50/50 border-b border-slate-100 p-6 flex items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Room Category</span>
                  </div>
                  <div
                    ref={leftTableRef}
                    onScroll={handleLeftScroll}
                    className="overflow-y-auto max-h-[500px] scrollbar-none"
                  >
                    {roomTypes.map((type) => (
                      <div key={type.id} className="h-24 p-6 border-b border-slate-50 flex flex-col justify-center bg-white group hover:bg-slate-50/30 transition-colors">
                        <span className="font-black text-slate-900 truncate text-base">{type.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                          {rooms.filter(r => r.roomTypeId === type.id).length} rooms total
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scrollable Columns - Dates Grid */}
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="h-[70px] bg-slate-50/50 border-b border-slate-100">
                        {days.map((day) => {
                          const formattedDate = format(day, 'dd');
                          const formattedDay = format(day, 'EEE');
                          const isWeekend = ['Sat', 'Sun'].includes(formattedDay);
                          return (
                            <th
                              key={day.toISOString()}
                              className={cn(
                                "p-3 text-center border-r border-slate-50/50 min-w-[70px]",
                                isWeekend && "bg-slate-100/10"
                              )}
                            >
                              <p className="text-[9px] font-black uppercase tracking-tight text-slate-400">{formattedDay}</p>
                              <p className="text-sm font-black text-slate-900 mt-0.5">{formattedDate}</p>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody
                      ref={rightTableRef}
                      onScroll={handleRightScroll}
                      className="overflow-y-auto max-h-[500px]"
                    >
                      {roomTypes.map((type) => (
                        <tr key={type.id} className="h-24 border-b border-slate-50 hover:bg-slate-50/10 transition-colors group">
                          {days.map((day) => {
                            const avail = getAvailability(type.id, day);
                            const total = rooms.filter(r => r.roomTypeId === type.id).length;
                            const isWeekend = ['Sat', 'Sun'].includes(format(day, 'EEE'));
                            return (
                              <td
                                key={day.toISOString()}
                                className={cn(
                                  "p-4 text-center border-r border-slate-50/50 align-middle",
                                  isWeekend && "bg-slate-100/10"
                                )}
                              >
                                <motion.div
                                  initial={false}
                                  animate={{ scale: [0.95, 1], opacity: [0, 1] }}
                                  className={cn(
                                    "w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-sm font-black transition-all shadow-sm",
                                    avail <= 0
                                      ? "bg-slate-900 text-white border-none"
                                      : avail <= 2
                                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                                        : "bg-white text-emerald-600 border border-slate-100 group-hover:border-primary/20"
                                  )}>
                                  {avail}
                                </motion.div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="p-2 border-t border-slate-100 md:hidden flex justify-center bg-slate-50/50">
                <Button
                  variant="ghost"
                  onClick={() => setIsGridExpanded(!isGridExpanded)}
                  className="font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-primary transition-colors h-10"
                >
                  {isGridExpanded ? 'Show Less' : 'More'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {roomTypes.map((type) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Card className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all group rounded-[2.5rem] bg-white relative">
                  <div className="h-2 w-full bg-slate-100 group-hover:bg-primary transition-colors absolute top-0" />
                  <CardHeader className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                        <BedDouble className="h-6 w-6" />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nightly Base</p>
                        <p className="text-2xl font-black text-slate-900">₹{Number(type.defaultPrice).toLocaleString()}</p>
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">{type.name}</CardTitle>
                    <CardDescription className="text-sm font-medium line-clamp-2">{type.description || 'Premium guest accommodation with full amenities.'}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 pt-0 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <Users className="h-4 w-4 text-slate-400 mb-2" />
                        <p className="text-lg font-black text-slate-900">{type.capacity}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Max Guests</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <Calendar className="h-4 w-4 text-slate-400 mb-2" />
                        <p className="text-lg font-black text-slate-900">{rooms.filter(r => r.roomTypeId === type.id).length}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Units</p>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex gap-4">
                      <Link href="/rooms" className="flex-1">
                        <Button variant="outline" className="w-full h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50">Manage Rooms</Button>
                      </Link>
                      <Link href="/rates">
                        <Button variant="secondary" className="h-12 w-12 rounded-xl p-0 hover:bg-primary hover:text-white transition-colors">
                          <TrendingUp className="h-5 w-5" />
                        </Button>
                      </Link>
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
