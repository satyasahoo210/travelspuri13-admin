'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, User, Phone, Mail, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from 'framer-motion';

export default function GuestsPage() {
  const guests = useLiveQuery(() => db.guests.toArray(), []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">Guests</h2>
          <p className="text-muted-foreground">Detailed profiles and stay history.</p>
        </div>
        <Button className="rounded-full shadow-lg">
          <Plus className="mr-2 h-4 w-4" />
          Add Guest
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by name, email or phone..." 
          className="pl-10 bg-card premium-card"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guests?.map((guest, i) => (
          <motion.div
            key={guest.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="premium-card group overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-none">{guest.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <History className="h-3 w-3" />
                      3 previous stays
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {guest.phone || 'N/A'}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {guest.email || 'N/A'}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t flex justify-between items-center">
                  <Button variant="ghost" size="sm" className="text-xs h-8">View History</Button>
                  <Button variant="outline" size="sm" className="text-xs h-8">Edit Profile</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {guests?.length === 0 && (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border-2 border-dashed border-muted/50">
          <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium">No guests found</h3>
          <p className="text-muted-foreground mb-6">Import your guest database or add manually.</p>
        </div>
      )}
    </div>
  );
}
