'use client';

import { useProperty } from '@/components/providers/property-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/utils/supabase/client';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MoreVertical,
  RefreshCcw,
  Search,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { gql, TypedDocumentNode } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';

type HousekeepingStatus = 'DIRTY' | 'CLEANING' | 'INSPECTING' | 'READY';
type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'DIRTY' | 'MAINTENANCE';

interface Room {
  id: string;
  roomNumber: string;
  status: RoomStatus;
  housekeepingStatus: HousekeepingStatus;
  priorityCleaning: boolean;
  RoomType?: {
    id: string;
    name: string;
  } | null;
}

interface RoomsListResponse {
  rooms: Room[];
}

const GET_ROOMS_LIST: TypedDocumentNode<RoomsListResponse, { propertyId: string }> = gql`
  query GetRoomsList($propertyId: String!) {
    rooms(propertyId: $propertyId) {
      id
      roomNumber
      status
      housekeepingStatus
      priorityCleaning
      RoomType {
        id
        name
      }
    }
  }
`;

const UPDATE_ROOM: TypedDocumentNode<{ updateRoom: Room }, { id: string, input: any }> = gql`
  mutation UpdateRoom($id: ID!, $input: UpdateRoomInput!) {
    updateRoom(id: $id, input: $input) {
      id
      roomNumber
      status
      housekeepingStatus
      priorityCleaning
    }
  }
`;

const statusColors = {
  DIRTY: 'bg-amber-50 text-amber-600 border-amber-200',
  CLEANING: 'bg-blue-50 text-blue-600 border-blue-200',
  INSPECTING: 'bg-purple-50 text-purple-600 border-purple-200',
  READY: 'bg-emerald-50 text-emerald-600 border-emerald-200'
};

export default function HousekeepingPage() {
  const { currentProperty } = useProperty();
  const supabase = createClient();
  const [search, setSearch] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);

  const { data: queryData, loading, refetch } = useQuery(GET_ROOMS_LIST, {
    variables: { propertyId: currentProperty?.id || '' },
    skip: !currentProperty?.id,
  });

  const [updateRoomMutation] = useMutation(UPDATE_ROOM);

  useEffect(() => {
    if (queryData) {
      setRooms(queryData.rooms || []);
    }
  }, [queryData]);

  useEffect(() => {
    if (!currentProperty) return;

    // Real-time subscription
    const channel = supabase
      .channel('housekeeping_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'Room'
      }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProperty, refetch]);

  const updateStatus = async (id: string, status: HousekeepingStatus) => {
    // Map housekeeping status to main room status
    let mainStatus: RoomStatus = 'DIRTY';
    if (status === 'READY') mainStatus = 'AVAILABLE';

    // Optimistic update
    setRooms(prev => prev.map(r => r.id === id ? { ...r, housekeepingStatus: status, status: mainStatus } : r));

    try {
      await updateRoomMutation({
        variables: {
          id,
          input: {
            housekeepingStatus: status,
            status: mainStatus
          }
        }
      });
    } catch (error) {
      console.error('Error updating status:', error);
      refetch(); // Revert on error
    }
  };

  const togglePriority = async (id: string, current: boolean) => {
    // Optimistic update
    setRooms(prev => prev.map(r => r.id === id ? { ...r, priorityCleaning: !current } : r));

    try {
      await updateRoomMutation({
        variables: {
          id,
          input: {
            priorityCleaning: !current
          }
        }
      });
    } catch (error) {
      console.error('Error toggling priority:', error);
      refetch(); // Revert on error
    }
  };

  const filteredRooms = rooms.filter(r =>
    r.roomNumber.includes(search) ||
    r.RoomType?.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && !rooms.length) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading housekeeping status...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-extrabold tracking-tight text-foreground">Housekeeping</h2>
          <p className="text-muted-foreground text-sm font-medium">Monitor and manage room readiness across the property.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search room..."
              className="pl-10 premium-card rounded-xl border-gray-200 focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Dirty', count: rooms.filter(r => r.housekeepingStatus === 'DIRTY').length, color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle },
          { label: 'Cleaning', count: rooms.filter(r => r.housekeepingStatus === 'CLEANING').length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
          { label: 'Inspecting', count: rooms.filter(r => r.housekeepingStatus === 'INSPECTING').length, color: 'text-purple-600', bg: 'bg-purple-50', icon: RefreshCcw },
          { label: 'Ready', count: rooms.filter(r => r.housekeepingStatus === 'READY').length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
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
        {filteredRooms.map((room) => (
          <Card key={room.id} className={cn(
            "premium-card transition-all overflow-hidden border-2",
            room.priorityCleaning ? "border-primary/20 bg-primary/[0.01]" : "border-transparent"
          )}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl font-black">{room.roomNumber}</CardTitle>
                    {room.priorityCleaning && (
                      <Badge className="bg-primary text-[8px] uppercase tracking-tighter px-1 h-4 animate-pulse">
                        <Zap className="h-2 w-2 mr-1 fill-current" /> Priority
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{room.RoomType?.name}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge className={cn("w-full justify-center font-bold text-[10px] uppercase tracking-widest h-8 rounded-lg border shadow-sm", statusColors[room.housekeepingStatus as keyof typeof statusColors])}>
                {room.housekeepingStatus}
              </Badge>

              <div className="grid grid-cols-4 gap-1.5">
                <Button
                  size="icon"
                  variant="outline"
                  className={cn("h-10 w-full rounded-lg transition-all hover:bg-amber-50", room.housekeepingStatus === 'DIRTY' && "bg-amber-100 border-amber-300 ring-2 ring-amber-200")}
                  onClick={() => updateStatus(room.id, 'DIRTY')}
                >
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className={cn("h-10 w-full rounded-lg transition-all hover:bg-blue-50", room.housekeepingStatus === 'CLEANING' && "bg-blue-100 border-blue-300 ring-2 ring-blue-200")}
                  onClick={() => updateStatus(room.id, 'CLEANING')}
                >
                  <Clock className="h-4 w-4 text-blue-600" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className={cn("h-10 w-full rounded-lg transition-all hover:bg-purple-50", room.housekeepingStatus === 'INSPECTING' && "bg-purple-100 border-purple-300 ring-2 ring-purple-200")}
                  onClick={() => updateStatus(room.id, 'INSPECTING')}
                >
                  <RefreshCcw className="h-4 w-4 text-purple-600" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className={cn("h-10 w-full rounded-lg transition-all hover:bg-emerald-50", room.housekeepingStatus === 'READY' && "bg-emerald-100 border-emerald-300 ring-2 ring-emerald-200")}
                  onClick={() => updateStatus(room.id, 'READY')}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </Button>
              </div>

              <Button
                variant="ghost"
                className={cn(
                  "w-full text-[10px] font-bold uppercase tracking-widest h-8 rounded-lg",
                  room.priorityCleaning ? "text-primary bg-primary/5 hover:bg-primary/10" : "text-muted-foreground hover:bg-gray-50"
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
