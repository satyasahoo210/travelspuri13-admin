/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BedDouble,
  Calendar,
  Filter,
  MapPin,
  Plus,
  Search,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { BookingDetails } from '@/components/bookings/booking-details'
import { BookingForm } from '@/components/bookings/booking-form'
import { useProperty } from '@/components/providers/property-provider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tables } from '@/database.types'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/utils/supabase/client'

type Booking = Tables<'Booking'> & {
  Guest: Pick<Tables<'Guest'>, 'name' | 'phone'>
  Property: Pick<Tables<'Property'>, 'name'>
  BookingRoom: Array<{
    Room: Pick<Tables<'Room'>, 'roomNumber'> | null
  }>
}

export default function BookingsPage() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const { currentProperty } = useProperty()

  const fetchBookings = async () => {
    if (!currentProperty) return

    setLoading(true)
    const { data, error } = await supabase
      .from('Booking')
      .select(
        '*, Guest(name, phone), Property(name), BookingRoom(Room(roomNumber))',
      )
      .eq('propertyId', currentProperty.id)
      .order('checkInDate', { ascending: false })

    if (error) {
      console.error('Error fetching bookings:', error)
    } else {
      setBookings(data)
    }
    setLoading(false)
  }

  useEffect(() => {    
    if (!isDetailsOpen && currentProperty) {
      const interval = setInterval(function repeatedFetchBookings() {
        fetchBookings()
        return repeatedFetchBookings;
      }(), 30000) // 30 seconds

      return () => clearInterval(interval)
    }
  }, [isDetailsOpen, currentProperty])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBookingClick = (booking: any) => {
    setSelectedBooking({
      ...booking,
      checkInDate: new Date(booking.checkInDate),
      checkOutDate: new Date(booking.checkOutDate),
    })
    setIsDetailsOpen(true)
  }

  const filteredBookings = bookings?.filter(
    (b) =>
      b.Guest?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.BookingRoom?.some((br) =>
        br.Room?.roomNumber?.toLowerCase().includes(search.toLowerCase()),
      ),
  )

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-heading font-black tracking-tighter text-slate-900 leading-none mb-2">
            Bookings
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
            Reservations Registry • {currentProperty?.name || 'All Properties'}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button className="rounded-2xl h-14 px-8 bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all font-heading font-black tracking-tighter text-lg" />
            }
          >
            <Plus className="mr-3 h-6 w-6" />
            NEW BOOKING
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
            <div className="bg-primary p-8 text-white">
              <DialogHeader>
                <DialogTitle className="text-3xl font-heading font-black tracking-tighter">
                  Register Stay
                </DialogTitle>
                <p className="text-white/70 font-bold uppercase tracking-widest text-[10px]">
                  New Reservation Details
                </p>
              </DialogHeader>
            </div>
            <div className="p-8">
              <BookingForm
                onSuccess={() => {
                  setOpen(false)
                  fetchBookings()
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by guest name or room number..."
            className="pl-12 h-14 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          className="h-14 px-6 rounded-2xl border-slate-200 bg-white shadow-sm font-black tracking-tighter hover:bg-slate-50"
        >
          <Filter className="mr-3 h-5 w-5 text-slate-400" />
          FILTERS
        </Button>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                Loading Reservations...
              </p>
            </div>
          ) : (
            filteredBookings?.map((booking, i) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleBookingClick(booking)}
              >
                <Card className="border-slate-200 hover:border-primary/30 cursor-pointer overflow-hidden group transition-all hover:shadow-xl hover:shadow-slate-200/50 rounded-3xl bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-primary/5 group-hover:border-primary/10 transition-colors">
                        <User className="h-6 w-6 text-slate-400 group-hover:text-primary" />
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                        <div className="space-y-1">
                          <p className="text-xl font-heading font-black tracking-tighter text-slate-900">
                            {booking.Guest?.name || 'Guest Not Found'}
                          </p>
                          <div className="flex items-center gap-2 text-slate-400">
                            <MapPin className="w-3 h-3" />
                            <span className="text-[10px] font-bold tracking-tight uppercase">
                              {booking.Property?.name}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <p className="text-sm font-black tracking-tight text-slate-900">
                              {format(new Date(booking.checkInDate), 'MMM d')} -{' '}
                              {format(new Date(booking.checkOutDate), 'MMM d')}
                            </p>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-6">
                            {format(new Date(booking.checkOutDate), 'yyyy')}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <BedDouble className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-black text-slate-900">
                              Room{' '}
                              {booking.BookingRoom.map(
                                (r) => r.Room?.roomNumber,
                              ).join(', ') || 'N/A'}
                            </span>
                          </div>
                          <Badge
                            className={cn(
                              'w-fit font-black text-[9px] uppercase tracking-widest border-none px-3',
                              booking.status === 'CONFIRMED'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : booking.status === 'CHECKED_IN'
                                    ? 'bg-primary/5 text-primary'
                                    : 'bg-slate-100 text-slate-400',
                            )}
                          >
                            {booking.status}
                          </Badge>
                        </div>

                        <div className="flex md:justify-end">
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-tighter mb-1">
                              Booking Total
                            </p>
                            <p className="text-2xl font-heading font-black tracking-tighter text-slate-900">
                              ₹{booking.totalAmount?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {!loading && filteredBookings?.length === 0 && (
          <div className="text-center py-32 bg-white rounded-[3rem] border border-slate-200 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Calendar className="h-10 w-10 text-slate-200" />
            </div>
            <h3 className="text-3xl font-heading font-black tracking-tighter text-slate-900 mb-2">
              No bookings found
            </h3>
            <p className="text-slate-400 font-bold mb-8">
              Ready to welcome your next guest?
            </p>
            <Button
              onClick={() => setOpen(true)}
              variant="outline"
              className="h-14 px-8 rounded-2xl border-slate-200 font-black tracking-tighter"
            >
              GENERATE NEW RESERVATION
            </Button>
          </div>
        )}
      </div>

      {selectedBooking && (
        <BookingDetails
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          booking={selectedBooking}
          onRefresh={fetchBookings}
        />
      )}
    </div>
  )
}
