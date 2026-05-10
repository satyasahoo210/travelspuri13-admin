'use client';

import { useProperty } from '@/components/providers/property-provider';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from '@/lib/utils/supabase/client';
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BedDouble, CheckCircle2, Construction, Eraser, Loader2 } from "lucide-react";
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

  const fetchRooms = async () => {
    if (!currentProperty) return;
    const { data } = await supabase
      .from('Room')
      .select('*, RoomType!inner(propertyId)')
      .eq('RoomType.propertyId', currentProperty.id)
      .order('roomNumber', { ascending: true });
    
    setRooms(data || []);
    setLoading(false);
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
       <header>
        <h2 className="text-3xl font-heading font-black tracking-tight text-foreground">Rooms</h2>
        <p className="text-muted-foreground text-sm font-medium">Monitor real-time room status across the property.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {Object.keys(statusIcons).map((status) => (
          <Badge key={status} variant="outline" className="px-3 py-1 font-bold text-[10px] uppercase tracking-widest bg-white/50 backdrop-blur-sm border-gray-200">
            {status}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {rooms?.map((room, i) => {
          const config = statusIcons[room.status as keyof typeof statusIcons] || statusIcons.AVAILABLE;
          return (
            <motion.div
              key={room.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.02 }}
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

      {rooms?.length === 0 && (
        <div className="text-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-muted/50 max-w-md mx-auto">
          <BedDouble className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-black">No rooms found</h3>
          <p className="text-muted-foreground text-sm font-medium px-8">Contact administrator to set up property rooms in the Manage section.</p>
        </div>
      )}
    </div>
  );
}
