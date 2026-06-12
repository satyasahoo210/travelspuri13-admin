'use client'

import { useProperty } from '@/components/providers/property-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { gql, TypedDocumentNode } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  ExternalLink,
  FileText,
  History,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Star,
  User
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

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

interface GqlBookingWithRoomsAndPayments {
  id: string;
  guestId: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount?: number | null;
  BookingRoom: Array<{
    id: string;
    Room: {
      id: string;
      roomNumber: string;
    } | null;
  }>;
  Payment: Array<{
    id: string;
    amount: number;
  }>;
}

interface GuestProfileQueryData {
  guest: GqlGuest | null;
  bookings: GqlBookingWithRoomsAndPayments[];
}

interface GuestProfileQueryVariables {
  id: string;
  guestId: string;
}

const GET_GUEST_PROFILE: TypedDocumentNode<GuestProfileQueryData, GuestProfileQueryVariables> = gql`
  query GetGuestProfile($id: ID!, $guestId: String!) {
    guest(id: $id) {
      id
      name
      phone
      email
      idProofType
      idProofNumber
      tenantId
      createdAt
      updatedAt
      address
      idProofUrl
      gstin
      grNumber
      preferences
      notes
    }
    bookings(guestId: $guestId) {
      id
      guestId
      status
      checkInDate
      checkOutDate
      totalAmount
      BookingRoom {
        id
        Room {
          id
          roomNumber
        }
      }
      Payment {
        id
        amount
      }
    }
  }
`;

export default function GuestProfilePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { currentProperty } = useProperty()

  const { data, loading } = useQuery(GET_GUEST_PROFILE, {
    variables: { id: id || '', guestId: id || '' },
    skip: !currentProperty?.id || !id,
  });

  const guestData = data?.guest;
  const bookings = data?.bookings || [];

  const guest = guestData ? {
    ...guestData,
    bookings
  } : null;

  const idProofUrl = guest?.idProofUrl
    ? (guest.idProofUrl.startsWith('http')
      ? guest.idProofUrl
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/guests/${guest.idProofUrl}`)
    : null;

  if (loading) {
    return <GuestProfileSkeleton />
  }

  if (!guest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h2 className="text-2xl font-black text-slate-900">Guest not found</h2>
        <Button onClick={() => router.back()} variant="outline">Go Back</Button>
      </div>
    )
  }

  const totalSpent = guest.bookings.reduce((sum: number, b: GqlBookingWithRoomsAndPayments) => sum + (b.totalAmount || 0), 0)
  const avgSpent = guest.bookings.length > 0 ? totalSpent / guest.bookings.length : 0

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full hover:bg-slate-100"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tighter text-slate-900">
            Guest Profile
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
            Customer ID: {guest.id.slice(0, 8)}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Info */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20">
            <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 relative">
              <div className="absolute -bottom-12 left-8">
                <div className="w-24 h-24 rounded-3xl bg-white border-4 border-white shadow-xl flex items-center justify-center">
                  <User className="h-12 w-12 text-primary" />
                </div>
              </div>
            </div>
            <CardContent className="pt-16 pb-8 px-8 space-y-6">
              <div>
                <h2 className="text-2xl font-heading font-black tracking-tighter text-slate-900">
                  {guest.name}
                </h2>
                <p className="text-slate-400 font-bold text-sm">
                  {guest.email || 'No email provided'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold">{guest.address || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold">{guest.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Spent</p>
                  <p className="text-xl font-heading font-black tracking-tighter text-slate-900">₹{totalSpent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg/Visit</p>
                  <p className="text-xl font-heading font-black tracking-tighter text-slate-900">₹{avgSpent.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences & Notes */}
          <Card className="rounded-[2.5rem] border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black tracking-tighter flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-sm font-bold text-slate-600 italic">
                  {guest.preferences || 'No preferences recorded for this guest.'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare className="h-3 w-3" />
                  Staff Notes
                </p>
                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                  {guest.notes || 'No internal notes found.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ID Proof Preview */}
          <Card className="rounded-[2.5rem] border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black tracking-tighter flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Identity Proof
              </CardTitle>
            </CardHeader>
            <CardContent>
              {idProofUrl ? (
                <div className="relative group rounded-2xl overflow-hidden border border-slate-200">
                  <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
                    <img
                      src={idProofUrl}
                      alt="ID Proof"
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-xl font-black tracking-tighter"
                      onClick={() => window.open(idProofUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      VIEW FULL
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-12 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center">
                  <ImageIcon className="h-8 w-8 text-slate-200 mb-2" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No ID Document Uploaded</p>
                </div>
              )}
              <div className="mt-4 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase">{guest.idProofType || 'UNKNOWN'}</span>
                <span className="font-black text-slate-900 tracking-widest">{guest.idProofNumber || '---'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stay History */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-heading font-black tracking-tighter text-slate-900 flex items-center gap-3">
              <History className="h-6 w-6 text-primary" />
              Stay History
            </h3>
            <Badge className="bg-slate-900 text-white font-black px-4 py-1.5 rounded-full text-[10px] tracking-widest uppercase">
              {guest.bookings.length} Total Visits
            </Badge>
          </div>

          <div className="space-y-4">
            {guest.bookings.sort((a: GqlBookingWithRoomsAndPayments, b: GqlBookingWithRoomsAndPayments) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime()).map((booking: GqlBookingWithRoomsAndPayments) => (
              <Card key={booking.id} className="rounded-3xl border-slate-200 hover:border-primary/20 transition-all bg-white shadow-sm group overflow-hidden">
                <CardContent className="p-0 flex flex-col md:flex-row">
                  <div className="p-6 flex-1 grid grid-cols-2 md:grid-cols-3 gap-6 items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <p className="text-sm font-black tracking-tight text-slate-900">
                          {format(new Date(booking.checkInDate), 'MMM d')} - {format(new Date(booking.checkOutDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 3600 * 24))} Nights Stay
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-black text-slate-900">
                          Rooms: {booking.BookingRoom.map((br: any) => br.Room?.roomNumber).join(', ') || 'N/A'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">
                        {booking.status}
                      </Badge>
                    </div>

                    <div className="md:text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount Paid</p>
                      <p className="text-xl font-heading font-black tracking-tighter text-slate-900">
                        ₹{(booking.totalAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="bg-slate-50 md:w-16 flex items-center justify-center p-4 border-t md:border-t-0 md:border-l border-slate-100 group-hover:bg-primary/5 transition-colors">
                    <Link href={`/bookings/${booking.id}`}>
                      <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-slate-400 group-hover:text-primary">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}

            {guest.bookings.length === 0 && (
              <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No previous stays found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function GuestProfileSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Skeleton className="h-[500px] rounded-[2.5rem]" />
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
