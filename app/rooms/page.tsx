'use client';

import { useProperty } from '@/components/providers/property-provider';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from '@/lib/utils/supabase/client';
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BedDouble, CheckCircle2, Construction, Eraser, Loader2, Search } from "lucide-react";
import { useEffect, useState } from 'react';

const statusIcons = {
  AVAILABLE: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  OCCUPIED: { icon: BedDouble, color: 'text-primary', bg: 'bg-primary/5' },
  DIRTY: { icon: Eraser, color: 'text-amber-500', bg: 'bg-amber-50' },
  MAINTENANCE: { icon: Construction, color: 'text-destructive', bg: 'bg-destructive/5' },
};

export default function RoomsPage() {
  const { currentProperty } = useProperty();
  const supabase = createClient();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRooms = async () => {
    if (!currentProperty) return;
    const { data } = await supabase
      .from('Room')
      .select('*, RoomType!inner(propertyId, name)')
      .eq('RoomType.propertyId', currentProperty.id);
    
    setRooms(data || []);
    setLoading(false);
  };

  const handleUpdateStatus = async (roomId: string, newStatus: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from('Room')
      .update({ status: newStatus as any })
      .eq('id', roomId);

    if (error) {
      console.error("Error updating room status:", error);
      alert("Failed to update room status");
    } else {
      setIsDialogOpen(false);
      setSelectedRoom(null);
      fetchRooms();
    }
    setUpdating(false);
  };

  useEffect(() => {
    fetchRooms();

    const channel = supabase
      .channel('rooms_live')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'Room' 
      }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProperty]);

  // Apply filters (searchQuery)
  const filteredRooms = rooms.filter((room) => {
    const query = searchQuery.toLowerCase();
    return (
      room.roomNumber.toLowerCase().includes(query) ||
      (room.RoomType?.name || '').toLowerCase().includes(query) ||
      (room.status || '').toLowerCase().includes(query)
    );
  });

  // Group rooms by room type
  const roomsByRoomType = filteredRooms.reduce<Record<string, any[]>>((acc, room) => {
    const typeName = room.RoomType?.name || 'Standard';
    if (!acc[typeName]) acc[typeName] = [];
    acc[typeName].push(room);
    return acc;
  }, {});

  // Sort room numbers numerically within each room type group
  Object.keys(roomsByRoomType).forEach((typeName) => {
    roomsByRoomType[typeName].sort((a: any, b: any) =>
      a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' })
    );
  });

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium text-sm text-center">
          Synchronizing rooms...<br/>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Travels Puri 13</span>
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-heading font-black tracking-tight text-foreground">Rooms</h2>
          <p className="text-muted-foreground text-sm font-medium">Monitor and manage real-time room status across the property.</p>
        </div>
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by Room Number or Type..."
            className="pl-12! h-12 rounded-2xl border-slate-100 bg-white shadow-sm text-sm font-bold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {Object.keys(statusIcons).map((status) => (
          <Badge key={status} variant="outline" className="px-3 py-1 font-bold text-[10px] uppercase tracking-widest bg-white/50 backdrop-blur-sm border-gray-200">
            {status}
          </Badge>
        ))}
      </div>

      <div className="space-y-8">
        {Object.keys(roomsByRoomType).length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-muted/50 max-w-md mx-auto">
            <BedDouble className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-black">No rooms found</h3>
            <p className="text-muted-foreground text-sm font-medium px-8">No rooms matched your query.</p>
          </div>
        ) : (
          (Object.entries(roomsByRoomType) as [string, any[]][]).map(([typeName, typeRooms]) => (
            <div key={typeName} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h3 className="font-heading font-black text-sm uppercase tracking-wider text-slate-700">{typeName} ({typeRooms.length})</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {typeRooms.map((room: any, i: number) => {
                  const config = statusIcons[room.status as keyof typeof statusIcons] || statusIcons.AVAILABLE;
                  return (
                    <motion.div
                      key={room.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.01 }}
                      onClick={() => {
                        setSelectedRoom(room);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Card className={cn(
                        "premium-card h-full min-h-[120px] cursor-pointer group hover:scale-105 transition-all overflow-hidden relative border-none shadow-sm",
                        config.bg
                      )}>
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                          <config.icon className={cn("h-6 w-6 mt-2", config.color)} />
                          <div>
                            <p className="text-lg font-black tracking-tight text-foreground">{room.roomNumber}</p>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold opacity-70">
                              {room.status}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Room Status Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl border-slate-100 max-w-md p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-slate-800 text-lg uppercase tracking-tight">Update Room Status</DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <div className="space-y-6 pt-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Room Number</p>
                  <p className="text-2xl font-heading font-black text-slate-900">Room {selectedRoom.roomNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-right">Current Status</p>
                  <Badge className="font-bold text-[10px] uppercase tracking-widest mt-1">
                    {selectedRoom.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'AVAILABLE', label: 'Available', color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
                  { value: 'DIRTY', label: 'Dirty', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
                  { value: 'MAINTENANCE', label: 'Maintenance', color: 'bg-destructive hover:bg-destructive/90 text-white' },
                  { value: 'OCCUPIED', label: 'Occupied', color: 'bg-slate-900 hover:bg-slate-800 text-white' },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    disabled={updating}
                    className={cn(
                      "h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-none shadow-sm transition-all active:scale-95",
                      selectedRoom.status === opt.value ? opt.color : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    )}
                    onClick={() => handleUpdateStatus(selectedRoom.id, opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  className="rounded-xl h-10 px-6 border-slate-200 font-black uppercase text-[10px] tracking-widest"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
