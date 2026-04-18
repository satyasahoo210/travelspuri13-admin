'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BedDouble, CheckCircle2, AlertTriangle, Construction, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const statusIcons = {
  AVAILABLE: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  OCCUPIED: { icon: BedDouble, color: 'text-primary', bg: 'bg-primary/5' },
  DIRTY: { icon: Eraser, color: 'text-amber-500', bg: 'bg-amber-50' },
  MAINTENANCE: { icon: Construction, color: 'text-destructive', bg: 'bg-destructive/5' },
};

export default function RoomsPage() {
  const rooms = useLiveQuery(() => db.rooms.toArray(), []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
       <header>
        <h2 className="text-3xl font-heading font-bold tracking-tight">Rooms</h2>
        <p className="text-muted-foreground">Monitor and update real-time room status.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {Object.keys(statusIcons).map((status) => (
          <Badge key={status} variant="outline" className="px-3 py-1 font-normal capitalize">
            {status.toLowerCase()}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {rooms?.map((room, i) => {
          const config = statusIcons[room.status] || statusIcons.AVAILABLE;
          return (
            <motion.div
              key={room.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card className={cn(
                "premium-card h-full min-h-[120px] cursor-pointer group hover:scale-105 transition-all overflow-hidden relative",
                config.bg
              )}>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                  <config.icon className={cn("h-6 w-6 mt-2", config.color)} />
                  <div>
                    <p className="text-lg font-bold tracking-tight">{room.roomNumber}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
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
        <div className="text-center py-20 bg-muted/30 rounded-2xl border-2 border-dashed border-muted/50">
          <BedDouble className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium">No rooms configured</h3>
          <p className="text-muted-foreground mb-6">Contact administrator to set up property rooms.</p>
        </div>
      )}
    </div>
  );
}
