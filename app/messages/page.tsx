'use client';

import { useState } from 'react';
import { useProperty } from '@/components/providers/property-provider';
import { db, Guest } from '@/lib/db/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
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
  CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function MessagesPage() {
  const { currentProperty } = useProperty();
  const [search, setSearch] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const guests = useLiveQuery(() => 
    db.guests.toArray()
  , []);

  const filteredGuests = guests?.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone?.includes(search)
  );

  const selectedGuest = guests?.find(g => g.id === selectedGuestId);

  // Mock messages for UI demo
  const [messages, setMessages] = useState([
    { id: 1, guestId: 'g1', text: 'Hello, what is the WiFi password?', sender: 'guest', time: '10:15 AM' },
    { id: 2, guestId: 'g1', text: 'Welcome! It is "antigravity2026". Enjoy your stay!', sender: 'staff', time: '10:16 AM' },
    { id: 3, guestId: 'g1', text: 'Thank you! Also, can I get extra towels?', sender: 'guest', time: '10:20 AM' },
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedGuestId) return;
    
    setMessages([...messages, {
      id: Date.now(),
      guestId: selectedGuestId,
      text: message,
      sender: 'staff',
      time: format(new Date(), 'h:mm a')
    }]);
    setMessage('');
  };

  return (
    <div className="h-[calc(100vh-80px)] p-6 overflow-hidden flex gap-6">
      {/* Sidebar - Guest List */}
      <div className="w-80 flex flex-col gap-4">
        <div className="relative">
          <Input 
            placeholder="Search guests..." 
            className="pl-10 rounded-xl bg-secondary/30 border-none shadow-inner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {filteredGuests?.map((guest) => (
            <motion.div
              key={guest.id}
              whileHover={{ x: 4 }}
              onClick={() => setSelectedGuestId(guest.id)}
              className={cn(
                "p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3",
                selectedGuestId === guest.id 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "bg-card/40 hover:bg-card/80"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                selectedGuestId === guest.id ? "bg-white/20" : "bg-primary/5 text-primary"
              )}>
                {guest.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-baseline">
                  <p className="font-bold truncate text-sm">{guest.name}</p>
                  <span className={cn("text-[10px] opacity-60 font-medium", selectedGuestId === guest.id ? "text-white" : "text-muted-foreground")}>
                    10:20 AM
                  </span>
                </div>
                <p className={cn("text-xs truncate opacity-70", selectedGuestId === guest.id ? "text-white" : "text-muted-foreground")}>
                  {guest.phone || "No message history"}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col premium-card overflow-hidden bg-card/10 backdrop-blur-md">
        {selectedGuest ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between bg-white/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {selectedGuest.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{selectedGuest.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Stay • Room 204</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/5">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/5">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               <div className="flex justify-center">
                  <Badge variant="secondary" className="bg-secondary/50 text-[10px] font-bold py-1 px-3">Today</Badge>
               </div>

               <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        msg.sender === 'staff' ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn(
                        "p-4 rounded-3xl text-sm leading-relaxed",
                        msg.sender === 'staff' 
                          ? "bg-primary text-primary-foreground rounded-tr-none shadow-md" 
                          : "bg-white rounded-tl-none shadow-sm border border-border/50"
                      )}>
                        {msg.text}
                      </div>
                      <div className="flex items-center gap-1 mt-1 font-bold text-[10px] text-muted-foreground/60 px-2 uppercase tracking-tight">
                        {msg.time}
                        {msg.sender === 'staff' && <CheckCheck className="h-3 w-3 text-primary/60" />}
                      </div>
                    </motion.div>
                  ))}
               </AnimatePresence>
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white/50 border-t">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <Button type="button" variant="ghost" size="icon" className="rounded-full hover:bg-secondary shrink-0">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <div className="relative flex-1">
                  <Input 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..." 
                    className="pr-12 py-6 rounded-2xl bg-secondary/30 border-none shadow-inner focus-visible:ring-primary/20"
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 rounded-full hover:bg-transparent">
                    <Smile className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                  </Button>
                </div>
                <Button type="submit" className="h-12 w-12 rounded-2xl shadow-lg shadow-primary/20 shrink-0">
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center space-y-4">
            <div className="p-6 bg-primary/5 rounded-full">
              <MessageSquare className="h-12 w-12 text-primary/20" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Select a Guest</h3>
              <p className="max-w-xs text-sm mt-1">Select a guest from the list to view your interaction history and respond to requests.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
