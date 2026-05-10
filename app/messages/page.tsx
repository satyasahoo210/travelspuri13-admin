'use client';

import { useState, useEffect, useRef } from 'react';
import { useProperty } from '@/components/providers/property-provider';
import { createClient } from '@/lib/utils/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Send, 
  MoreVertical, 
  Phone, 
  MessageSquare, 
  Clock, 
  Smile, 
  Paperclip,
  User,
  CheckCheck,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function MessagesPage() {
  const { currentProperty } = useProperty();
  const supabase = createClient();
  const [search, setSearch] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [guests, setGuests] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchGuests = async () => {
    if (!currentProperty) return;
    const { data } = await supabase
      .from('Guest')
      .select('*, Booking(id, status, BookingRoom(Room(roomNumber)))')
      .eq('tenantId', currentProperty.tenantId);
    
    setGuests(data || []);
    setLoading(false);
  };

  const fetchMessages = async (guestId: string) => {
    const { data } = await supabase
      .from('Message')
      .select('*')
      .eq('guestId', guestId)
      .order('createdAt', { ascending: true });
    
    setMessages(data || []);
  };

  useEffect(() => {
    fetchGuests();
  }, [currentProperty]);

  useEffect(() => {
    if (selectedGuestId) {
      fetchMessages(selectedGuestId);

      // Subscribe to real-time messages
      const channel = supabase
        .channel(`guest-messages-${selectedGuestId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'Message',
          filter: `guestId=eq.${selectedGuestId}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedGuestId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredGuests = guests?.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone?.includes(search)
  );

  const selectedGuest = guests?.find(g => g.id === selectedGuestId);
  const activeBooking = selectedGuest?.Booking?.find((b: any) => b.status === 'CHECKED_IN');
  const roomNumber = activeBooking?.BookingRoom?.[0]?.Room?.roomNumber;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedGuestId || !currentProperty) return;
    
    const newMessage = {
      guestId: selectedGuestId,
      bookingId: activeBooking?.id,
      tenantId: currentProperty.tenantId,
      content: message,
      direction: 'OUTBOUND',
      status: 'SENT',
      channel: 'WHATSAPP'
    };

    // Optimistic update
    const optimisticMsg = { ...newMessage, id: Date.now(), createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticMsg]);
    setMessage('');

    const { error } = await supabase.from('Message').insert(newMessage);
    if (error) {
      console.error('Failed to send message:', error);
      // Rollback or show error
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Syncing Conversations...</p>
    </div>
  );

  return (
    <div className="h-[calc(100vh-80px)] p-6 overflow-hidden flex gap-6">
      {/* Sidebar - Guest List */}
      <div className="w-80 flex flex-col gap-4">
        <div className="relative">
          <Input 
            placeholder="Search guests..." 
            className="pl-10 rounded-2xl bg-white/50 border-none shadow-sm h-12 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {filteredGuests?.map((guest) => (
            <motion.div
              key={guest.id}
              whileHover={{ x: 4 }}
              onClick={() => setSelectedGuestId(guest.id)}
              className={cn(
                "p-4 rounded-[1.5rem] cursor-pointer transition-all flex items-center gap-4 border border-transparent",
                selectedGuestId === guest.id 
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10" 
                  : "bg-white hover:bg-slate-50 hover:border-slate-100 shadow-sm"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 rotate-3",
                selectedGuestId === guest.id ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
              )}>
                {guest.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-baseline mb-0.5">
                  <p className="font-black truncate text-sm tracking-tight">{guest.name}</p>
                </div>
                <p className={cn("text-[10px] truncate font-bold uppercase tracking-widest", selectedGuestId === guest.id ? "text-white/60" : "text-muted-foreground")}>
                  {guest.phone || "No History"}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col premium-card overflow-hidden bg-white/40 backdrop-blur-xl border-none shadow-2xl rounded-[2.5rem]">
        {selectedGuest ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b flex items-center justify-between bg-white/80">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black rotate-2 shadow-inner">
                  {selectedGuest.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight text-slate-900">{selectedGuest.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      {roomNumber ? `Active Stay • Room ${roomNumber}` : 'No Active Booking'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-slate-100 h-10 w-10">
                  <Phone className="h-4 w-4 text-slate-600" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-slate-100 h-10 w-10">
                  <MoreVertical className="h-4 w-4 text-slate-600" />
                </Button>
              </div>
            </div>

            {/* Messages List */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/30">
               <div className="flex justify-center">
                  <Badge variant="secondary" className="bg-white/80 text-slate-400 text-[10px] font-black uppercase tracking-widest py-1.5 px-4 shadow-sm">Interaction History</Badge>
               </div>

               <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={cn(
                        "flex flex-col max-w-[75%]",
                        msg.direction === 'OUTBOUND' ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn(
                        "p-5 rounded-[2rem] text-sm font-medium leading-relaxed shadow-sm",
                        msg.direction === 'OUTBOUND' 
                          ? "bg-slate-900 text-white rounded-tr-none shadow-xl shadow-slate-900/10" 
                          : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                      )}>
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 mt-2 font-black text-[9px] text-slate-400 px-2 uppercase tracking-widest">
                        {format(new Date(msg.createdAt), 'h:mm a')}
                        {msg.direction === 'OUTBOUND' && <CheckCheck className="h-3 w-3 text-primary" />}
                      </div>
                    </motion.div>
                  ))}
               </AnimatePresence>
            </div>

            {/* Message Input */}
            <div className="p-6 bg-white border-t">
              <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                <Button type="button" variant="ghost" size="icon" className="rounded-2xl hover:bg-slate-100 shrink-0 h-12 w-12">
                  <Paperclip className="h-5 w-5 text-slate-400" />
                </Button>
                <div className="relative flex-1">
                  <Input 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..." 
                    className="pr-12 h-14 rounded-2xl bg-slate-100 border-none shadow-inner focus-visible:ring-primary/20 font-medium"
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 rounded-xl hover:bg-transparent h-10 w-10">
                    <Smile className="h-5 w-5 text-slate-400 hover:text-primary transition-colors" />
                  </Button>
                </div>
                <Button type="submit" className="h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 shrink-0 font-black uppercase tracking-widest text-[11px] gap-3">
                  <Send className="h-4 w-4" /> Send
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center rotate-6 shadow-inner">
              <MessageSquare className="h-10 w-10 text-primary/30" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Messaging Hub</h3>
              <p className="max-w-xs text-sm font-medium text-slate-400">Select a guest from the list to view your interaction history and respond to requests.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
