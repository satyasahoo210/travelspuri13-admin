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
import { AnimatePresence, motion } from 'framer-motion';
import { BedDouble, Calendar, Info, Loader2, Plus, Save, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

type RoomType = Tables<'RoomType'>;
type Room = Tables<'Room'>;
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

  // Date Range State
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 13), 'yyyy-MM-dd'));

  // Refs for scroll synchronization
  const leftTableRef = useRef<HTMLDivElement>(null);
  const rightTableRef = useRef<HTMLDivElement>(null);

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

  const loadData = async () => {
    if (!currentProperty) return;
    setIsLoading(true);

    try {
      const [rtRes, rRes, bRes] = await Promise.all([
        supabase.from('RoomType').select('*').eq('propertyId', currentProperty.id),
        supabase.from('Room').select('*, RoomType!inner(*)').eq('RoomType.propertyId', currentProperty.id),
        supabase.from('Booking').select('*, BookingRoom(*)').eq('propertyId', currentProperty.id).neq('status', 'CANCELLED')
      ]);

      if (rtRes.data) setRoomTypes(rtRes.data);
      if (rRes.data) setRooms(rRes.data);
      if (bRes.data) setBookings(bRes.data);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates for bookings and rooms
    if (currentProperty) {
      const channel = supabase
        .channel('inventory-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Booking', filter: `propertyId=eq.${currentProperty.id}` }, () => loadData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'BookingRoom' }, () => loadData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Room' }, () => loadData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
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

  if (isLoading) return (
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
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Max Capacity</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Base Rate (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={formData.defaultPrice}
                    onChange={e => setFormData({ ...formData, defaultPrice: parseFloat(e.target.value) })}
                    className="h-12 rounded-xl bg-slate-50 border-none font-bold text-primary"
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Register Category
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl inline-flex gap-1 mb-8 shadow-inner w-full justify-start overflow-x-auto scrollbar-none flex-nowrap">
          <TabsTrigger value="grid" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap shrink-0">
            Availability Grid
          </TabsTrigger>
          <TabsTrigger value="types" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap shrink-0">
            Room Products
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-0">
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white/40 backdrop-blur-xl overflow-hidden">
            <CardHeader className="bg-white/80 p-8 border-b border-slate-100">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">
                      {days.length}-Day Projections
                    </CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Real-time room blocks by category
                    </CardDescription>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-4 py-1.5 rounded-full font-black uppercase text-[9px] tracking-widest shrink-0">
                    Live Sync Enabled
                  </Badge>
                </div>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pt-4 border-t border-slate-100/60">
                  <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setEndDate(e.target.value);
                        }}
                        className="h-10 rounded-xl bg-slate-50 border-none font-bold text-xs shadow-inner"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-10 rounded-xl bg-slate-50 border-none font-bold text-xs shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 w-full lg:w-auto justify-start lg:justify-end">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-2 block w-full lg:w-auto">Presets:</span>
                    {([
                      { label: 'Today', days: 1 },
                      { label: '7 Days', days: 7 },
                      { label: '14 Days', days: 14 },
                      { label: '30 Days', days: 30 },
                    ] as { label: string; days: number }[]).map((preset) => {
                      const isActive = (() => {
                        const start = new Date(startDate);
                        const end = new Date(endDate);
                        const diffTime = end.getTime() - start.getTime();
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        return diffDays === preset.days && format(start, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      })();

                      return (
                        <Button
                          key={preset.label}
                          type="button"
                          variant={isActive ? 'default' : 'outline'}
                          onClick={() => {
                            const today = new Date();
                            setStartDate(format(today, 'yyyy-MM-dd'));
                            setEndDate(format(addDays(today, preset.days - 1), 'yyyy-MM-dd'));
                          }}
                          className={cn(
                            "h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all",
                            isActive
                              ? "bg-slate-900 text-white border-none shadow-md shadow-slate-900/10"
                              : "border-slate-100 hover:bg-slate-50 text-slate-500"
                          )}
                        >
                          {preset.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-w-[93vw] md:max-w-[80vw]">
              <div className="flex w-full overflow-hidden">
                {/* Left Table: Room Category (Fixed first column) */}
                <div
                  ref={leftTableRef}
                  onScroll={handleLeftScroll}
                  className="overflow-y-auto max-h-[calc(100vh-340px)] shrink-0 min-w-[180px] sm:min-w-[220px] bg-white border-r border-slate-100 shadow-[4px_0_12px_rgba(0,0,0,0.02)] scrollbar-none"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 h-[88px] sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md">
                        <th className="p-4 sm:p-8 text-left font-black uppercase tracking-widest text-[10px] text-slate-400 border-b border-slate-100">Room Category</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/30">
                      {roomTypes.map(type => (
                        <tr key={type.id} className="hover:bg-slate-50/50 transition-all h-[96px]">
                          <td className="p-4 border-b border-slate-100 bg-white max-w-20 md:max-w-full">
                            <div className="font-black text-slate-900 tracking-tight text-base">{type.name}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Base Rate: ₹{Number(type.defaultPrice).toLocaleString()}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Right Table: Scrollable Calendar Grid */}
                <div
                  ref={rightTableRef}
                  onScroll={handleRightScroll}
                  className="flex-1 overflow-auto max-h-[calc(100vh-340px)]"
                >
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 h-[88px] sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md">
                        {days.map((day, index) => (
                          <th
                            key={day.toISOString()}
                            className={cn(
                              "p-4 text-center border-b border-slate-100 min-w-[80px]",
                              !isGridExpanded && index > 1 ? "hidden md:table-cell" : ""
                            )}
                          >
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{format(day, 'EEE')}</div>
                            <div className={cn(
                              "text-base font-black w-10 h-10 mx-auto flex items-center justify-center rounded-xl",
                              format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-900"
                            )}>
                              {format(day, 'dd')}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white/30">
                      {roomTypes.map(type => (
                        <tr key={type.id} className="hover:bg-white/80 transition-all h-[96px] group">
                          {days.map((day, index) => {
                            const avail = getAvailability(type.id, day);
                            return (
                              <td
                                key={day.toISOString()}
                                className={cn(
                                  "p-4 border-b border-slate-100 text-center",
                                  !isGridExpanded && index > 1 ? "hidden md:table-cell" : ""
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
                    <CardDescription className="text-sm font-medium line-clamp-2">{(type as any).description || 'Premium guest accommodation with full amenities.'}</CardDescription>
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
