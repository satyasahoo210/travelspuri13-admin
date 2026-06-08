'use client';

import { gql, TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useProperty } from '@/components/providers/property-provider';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from 'framer-motion';
import { History, Mail, Phone, Plus, Search, User } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface GqlGuest {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  tenantId: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  address?: string | null;
  idProofType?: string | null;
  idProofNumber?: string | null;
  idProofUrl?: string | null;
  gstin?: string | null;
  grNumber?: string | null;
  preferences?: string | null;
  notes?: string | null;
}

interface GqlBriefBooking {
  id: string;
  guestId: string;
}

interface GuestsAndBookingsData {
  guests: GqlGuest[];
  bookings: GqlBriefBooking[];
}

interface GuestsAndBookingsVariables {
  propertyId: string;
}

const GET_GUESTS_AND_BOOKINGS: TypedDocumentNode<GuestsAndBookingsData, GuestsAndBookingsVariables> = gql`
  query GetGuestsAndBookings($propertyId: String!) {
    guests {
      id
      name
      phone
      email
      tenantId
      createdAt
      updatedAt
      address
      idProofType
      idProofNumber
      idProofUrl
      gstin
      grNumber
      preferences
      notes
    }
    bookings(propertyId: $propertyId) {
      id
      guestId
    }
  }
`;

export default function GuestsPage() {
  const router = useRouter();
  const { currentProperty } = useProperty();
  const [search, setSearch] = useState('');

  const { data, loading } = useQuery(GET_GUESTS_AND_BOOKINGS, {
    variables: { propertyId: currentProperty?.id || '' },
    skip: !currentProperty?.id,
  });

interface MappedGuest extends GqlGuest {
  _count: {
    Booking: number;
  };
}

  const guestsList = data?.guests || [];
  const bookingsList = data?.bookings || [];

  const guests: MappedGuest[] = guestsList.map((g: GqlGuest) => {
    const guestBookings = bookingsList.filter((b: GqlBriefBooking) => b.guestId === g.id);
    return {
      ...g,
      _count: { Booking: guestBookings.length }
    };
  }).sort((a: MappedGuest, b: MappedGuest) => a.name.localeCompare(b.name));

  const filteredGuests = guests?.filter((g: MappedGuest) => 
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.phone && g.phone.includes(search)) ||
    (g.email && g.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-heading font-black tracking-tighter text-slate-900 leading-none mb-2">
            Guests
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
            Guest CRM • Relationship Management
          </p>
        </div>
        <Button className="rounded-2xl h-14 px-8 bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all font-heading font-black tracking-tighter text-lg">
          <Plus className="mr-3 h-6 w-6" />
          ADD GUEST
        </Button>
      </header>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Search by name, email or phone..." 
          className="pl-12 h-14 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="wait">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-[2.5rem]" />
            ))
          ) : (
            filteredGuests?.map((guest: MappedGuest, i: number) => (
              <motion.div
                key={guest.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/guests/${guest.id}`)}
                className="cursor-pointer"
              >
                <Card className="rounded-[2rem] border-slate-200 hover:border-primary/30 overflow-hidden group transition-all hover:shadow-xl hover:shadow-slate-200/50 bg-white shadow-sm">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-primary/5 group-hover:border-primary/10 transition-colors">
                        <User className="h-6 w-6 text-slate-400 group-hover:text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading font-black text-xl tracking-tighter text-slate-900 truncate">
                          {guest.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none font-black text-[8px] uppercase tracking-widest px-2">
                            {guest._count?.Booking || 0} Visits
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                        <Phone className="h-4 w-4 text-slate-300" />
                        {guest.phone || 'No phone'}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                        <Mail className="h-4 w-4 text-slate-300" />
                        <span className="truncate">{guest.email || 'No email'}</span>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                      <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest h-8 rounded-xl hover:bg-primary/5 hover:text-primary">
                        <History className="h-3 w-3 mr-2" />
                        View Profile
                      </Button>
                      <Button variant="outline" size="sm" className="text-[10px] font-black uppercase tracking-widest h-8 rounded-xl border-slate-200">
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {!loading && filteredGuests?.length === 0 && (
        <div className="text-center py-32 bg-white rounded-[3rem] border border-slate-200 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <User className="h-10 w-10 text-slate-200" />
          </div>
          <h3 className="text-3xl font-heading font-black tracking-tighter text-slate-900 mb-2">
            No guests found
          </h3>
          <p className="text-slate-400 font-bold mb-8">
            Start building your guest relationships today.
          </p>
          <Button className="h-14 px-8 rounded-2xl font-black tracking-tighter">
            ADD YOUR FIRST GUEST
          </Button>
        </div>
      )}
    </div>
  );
}
