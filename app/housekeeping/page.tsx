'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db, Room } from '@/lib/db/dexie';
import { cn } from '@/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreVertical,
  RefreshCcw,
  Search,
  Zap
} from 'lucide-react';
import { useState } from 'react';

const statusColors = {
  READY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLEANING: 'bg-blue-50 text-blue-700 border-blue-200',
  INSPECTING: 'bg-purple-50 text-purple-700 border-purple-200',
  DIRTY: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function HousekeepingPage() {
  const [search, setSearch] = useState('');
  const rooms = useLiveQuery(
    () => db.rooms.toArray(),
    []
  );

  const updateStatus = async (id: string, status: Room['housekeepingStatus']) => {
    await db.rooms.update(id, { 
      housekeepingStatus: status,
      updatedAt: Date.now() 
    });
  };

  const togglePriority = async (id: string, current: boolean) => {
    await db.rooms.update(id, { priorityCleaning: !current });
  };

  const filteredRooms = rooms?.filter(r => 
    r.roomNumber.includes(search) || 
    r.roomTypeId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-extrabold tracking-tight">Housekeeping</h2>
          <p className="text-muted-foreground text-sm">Monitor and manage room readiness across the property.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search room..." 
              className="pl-10 premium-card rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Dirty', count: rooms?.filter(r => r.housekeepingStatus === 'DIRTY').length || 0, color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle },
          { label: 'Cleaning', count: rooms?.filter(r => r.housekeepingStatus === 'CLEANING').length || 0, color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
          { label: 'Inspecting', count: rooms?.filter(r => r.housekeepingStatus === 'INSPECTING').length || 0, color: 'text-purple-600', bg: 'bg-purple-50', icon: RefreshCcw },
          { label: 'Ready', count: rooms?.filter(r => r.housekeepingStatus === 'READY').length || 0, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
        ].map((stat) => (
          <Card key={stat.label} className={cn("border-none shadow-sm", stat.bg)}>
            <div className="p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">{stat.label}</p>
                <h3 className={cn("text-2xl font-black mt-1", stat.color)}>{stat.count}</h3>
              </div>
              <div className={cn("p-2 rounded-lg bg-white/50", stat.color)}>
                 <stat.icon className="h-4 w-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRooms?.map((room) => (
          <Card key={room.id} className={cn(
            "premium-card transition-all overflow-hidden border-2",
            room.priorityCleaning ? "border-primary/20 bg-primary/[0.02]" : "border-transparent"
          )}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl font-black">{room.roomNumber}</CardTitle>
                    {room.priorityCleaning && (
                      <Badge className="bg-primary text-[8px] uppercase tracking-tighter px-1 h-4">
                        <Zap className="h-2 w-2 mr-1" /> Priority
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{room.roomTypeId}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge className={cn("w-full justify-center font-bold text-[10px] uppercase tracking-widest h-8 rounded-lg border", statusColors[room.housekeepingStatus])}>
                {room.housekeepingStatus}
              </Badge>

              <div className="grid grid-cols-4 gap-1.5">
                <Button 
                  size="icon" 
                  variant="outline" 
                  className={cn("h-10 w-full rounded-lg transition-all", room.housekeepingStatus === 'DIRTY' && "bg-amber-100 border-amber-300")}
                  onClick={() => updateStatus(room.id, 'DIRTY')}
                >
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className={cn("h-10 w-full rounded-lg transition-all", room.housekeepingStatus === 'CLEANING' && "bg-blue-100 border-blue-300")}
                  onClick={() => updateStatus(room.id, 'CLEANING')}
                >
                  <Clock className="h-4 w-4 text-blue-600" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className={cn("h-10 w-full rounded-lg transition-all", room.housekeepingStatus === 'INSPECTING' && "bg-purple-100 border-purple-300")}
                  onClick={() => updateStatus(room.id, 'INSPECTING')}
                >
                  <RefreshCcw className="h-4 w-4 text-purple-600" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className={cn("h-10 w-full rounded-lg transition-all", room.housekeepingStatus === 'READY' && "bg-emerald-100 border-emerald-300")}
                  onClick={() => updateStatus(room.id, 'READY')}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </Button>
              </div>

              <Button 
                variant="ghost" 
                className={cn(
                  "w-full text-[10px] font-bold uppercase tracking-widest h-8",
                  room.priorityCleaning ? "text-primary hover:text-primary hover:bg-primary/5" : "text-muted-foreground"
                )}
                onClick={() => togglePriority(room.id, room.priorityCleaning)}
              >
                {room.priorityCleaning ? 'Unmark Priority' : 'Mark as Priority'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
