/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { differenceInDays, endOfDay, format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BedDouble,
  Calendar,
  ChevronDown,
  Filter,
  MapPin,
  Plus,
  Search,
  User,
  X
} from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

import { useProperty } from '@/components/providers/property-provider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tables } from '@/database.types'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/utils/supabase/client'

type Booking = Tables<'Booking'> & {
  Guest: Pick<Tables<'Guest'>, 'name' | 'phone'>
  Property: Pick<Tables<'Property'>, 'name'>
  BookingRoom: Array<{
    Room: Pick<Tables<'Room'>, 'roomNumber'> | null
  }>
  Payment: Array<{ amount: number }>
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black text-slate-200 uppercase tracking-widest animate-pulse">Initializing Registry...</div>}>
      <BookingsContent />
    </Suspense>
  )
}

function BookingsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'checkedin')

  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const [filters, setFilters] = useState({
    hasDue: searchParams.get('hasDue') === 'true',
    checkInFrom: searchParams.get('checkInFrom') || '',
    checkInTo: searchParams.get('checkInTo') || '',
    checkOutFrom: searchParams.get('checkOutFrom') || '',
    checkOutTo: searchParams.get('checkOutTo') || '',
    minNights: searchParams.get('minNights') || '',
    maxNights: searchParams.get('maxNights') || '',
    minAmount: searchParams.get('minAmount') || '',
    maxAmount: searchParams.get('maxAmount') || '',
  })

  const supabase = createClient()
  const { currentProperty } = useProperty()

  const fetchBookings = async () => {
    if (!currentProperty) return

    setLoading(true)
    const { data, error } = await supabase
      .from('Booking')
      .select(
        '*, Guest(name, phone), Property(name), BookingRoom(Room(roomNumber)), Payment(amount)',
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
    if (currentProperty) {
      fetchBookings()
    }
  }, [currentProperty])

  // Update URL search params when filters/search/tab changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (activeTab !== 'checkedin') params.set('tab', activeTab)
    if (filters.hasDue) params.set('hasDue', 'true')
    if (filters.checkInFrom) params.set('checkInFrom', filters.checkInFrom)
    if (filters.checkInTo) params.set('checkInTo', filters.checkInTo)
    if (filters.checkOutFrom) params.set('checkOutFrom', filters.checkOutFrom)
    if (filters.checkOutTo) params.set('checkOutTo', filters.checkOutTo)
    if (filters.minNights) params.set('minNights', filters.minNights)
    if (filters.maxNights) params.set('maxNights', filters.maxNights)
    if (filters.minAmount) params.set('minAmount', filters.minAmount)
    if (filters.maxAmount) params.set('maxAmount', filters.maxAmount)

    const queryString = params.toString()
    const url = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(url, { scroll: false })
  }, [search, filters, activeTab, pathname, router])

  const handleBookingClick = (booking: any) => {
    router.push(`/bookings/${booking.id}`)
  }

  const filteredBookings = useMemo(() => {
    if (!bookings) return []

    return bookings.filter((b) => {
      // Search filter
      const matchesSearch = !search ||
        b.Guest?.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.BookingRoom?.some((br) =>
          br.Room?.roomNumber?.toLowerCase().includes(search.toLowerCase()),
        )

      if (!matchesSearch) return false

      // Advanced filters
      if (filters.hasDue && getTotalDue(b) <= 0) return false

      if (filters.checkInFrom && isBefore(parseISO(b.checkInDate), startOfDay(parseISO(filters.checkInFrom)))) return false
      if (filters.checkInTo && isAfter(parseISO(b.checkInDate), endOfDay(parseISO(filters.checkInTo)))) return false

      if (filters.checkOutFrom && isBefore(parseISO(b.checkOutDate), startOfDay(parseISO(filters.checkOutFrom)))) return false
      if (filters.checkOutTo && isAfter(parseISO(b.checkOutDate), endOfDay(parseISO(filters.checkOutTo)))) return false

      const nights = differenceInDays(new Date(b.checkOutDate), new Date(b.checkInDate))
      if (filters.minNights && nights < parseInt(filters.minNights)) return false
      if (filters.maxNights && nights > parseInt(filters.maxNights)) return false

      if (filters.minAmount && (b.totalAmount || 0) < parseFloat(filters.minAmount)) return false
      if (filters.maxAmount && (b.totalAmount || 0) > parseFloat(filters.maxAmount)) return false

      return true
    })
  }, [bookings, search, filters])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.hasDue) count++
    if (filters.checkInFrom || filters.checkInTo) count++
    if (filters.checkOutFrom || filters.checkOutTo) count++
    if (filters.minNights || filters.maxNights) count++
    if (filters.minAmount || filters.maxAmount) count++
    return count
  }, [filters])

  const clearFilters = () => {
    setFilters({
      hasDue: false,
      checkInFrom: '',
      checkInTo: '',
      checkOutFrom: '',
      checkOutTo: '',
      minNights: '',
      maxNights: '',
      minAmount: '',
      maxAmount: '',
    })
  }

  const upcomingBookings = filteredBookings?.filter((b) =>
    ['CONFIRMED', 'PENDING'].includes(b.status || '')
  )

  const checkedInBookings = filteredBookings?.filter((b) =>
    b.status === 'CHECKED_IN'
  )

  const pastBookings = filteredBookings?.filter((b) =>
    ['CHECKED_OUT', 'NOSHOW'].includes(b.status || '')
  )

  const cancelledBookings = filteredBookings?.filter((b) =>
    b.status === 'CANCELLED'
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

        <Button
          onClick={() => router.push('/bookings/new')}
          className="rounded-2xl h-14 px-8 bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all font-heading font-black tracking-tighter text-lg"
        >
          <Plus className="mr-3 h-6 w-6" />
          NEW BOOKING
        </Button>
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
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger render={
            <Button
              variant="outline"
              className={cn(
                "h-14 px-6 rounded-2xl border-slate-200 bg-white shadow-sm font-black tracking-tighter transition-all hover:bg-slate-50",
                activeFiltersCount > 0 && "border-primary bg-primary/5 text-primary"
              )}
            />
          }>
            <Filter className={cn("mr-3 h-5 w-5", activeFiltersCount > 0 ? "text-primary" : "text-slate-400")} />
            FILTERS
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 bg-primary text-white border-none rounded-full w-5 h-5 flex items-center justify-center p-0 text-[10px]">
                {activeFiltersCount}
              </Badge>
            )}
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md p-0 flex flex-col bg-white border-l border-slate-100">
            <SheetHeader className="p-8 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-3xl font-heading font-black tracking-tighter text-slate-900">
                    Filters
                  </SheetTitle>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">
                    Refine Registry Results
                  </p>
                </div>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/5"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-none">
              {/* Financial Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Financial Status</Label>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-primary/20">
                  <Checkbox
                    id="hasDue"
                    checked={filters.hasDue}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasDue: !!checked }))}
                    className="w-6 h-6 rounded-lg border-2 border-slate-200 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                  />
                  <Label htmlFor="hasDue" className="font-bold text-slate-700 cursor-pointer flex-1 py-1">
                    Show only bookings with pending balance
                  </Label>
                </div>
              </div>

              {/* Date Ranges */}
              <div className="space-y-6">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Date Registry</Label>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">Check-in Window</p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="date"
                      value={filters.checkInFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, checkInFrom: e.target.value }))}
                      className="bg-slate-50 border-slate-200 rounded-xl h-12 font-bold"
                    />
                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <Input
                      type="date"
                      value={filters.checkInTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, checkInTo: e.target.value }))}
                      className="bg-slate-50 border-slate-200 rounded-xl h-12 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">Check-out Window</p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="date"
                      value={filters.checkOutFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, checkOutFrom: e.target.value }))}
                      className="bg-slate-50 border-slate-200 rounded-xl h-12 font-bold"
                    />
                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <Input
                      type="date"
                      value={filters.checkOutTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, checkOutTo: e.target.value }))}
                      className="bg-slate-50 border-slate-200 rounded-xl h-12 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Stay Duration */}
              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Stay Duration (Nights)</Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.minNights}
                      onChange={(e) => setFilters(prev => ({ ...prev, minNights: e.target.value }))}
                      className="bg-slate-50 border-slate-200 rounded-xl h-12 font-bold"
                    />
                  </div>
                  <span className="text-slate-300 font-bold">—</span>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.maxNights}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxNights: e.target.value }))}
                      className="bg-slate-50 border-slate-200 rounded-xl h-12 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Amount Range */}
              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Total Amount (₹)</Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.minAmount}
                      onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                      className="bg-slate-50 border-slate-200 rounded-xl h-12 pl-7 font-bold"
                    />
                  </div>
                  <span className="text-slate-300 font-bold">—</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.maxAmount}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                      className="bg-slate-50 border-slate-200 rounded-xl h-12 pl-7 font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter className="p-8 border-t border-slate-50 bg-slate-50/50">
              <Button
                onClick={() => setIsFilterOpen(false)}
                className="w-full h-14 rounded-2xl bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all font-heading font-black tracking-tighter text-lg"
              >
                APPLY FILTERS
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 mb-8">
          <TabsTrigger value="upcoming" className="rounded-xl font-black text-xs uppercase tracking-widest px-8">
            Upcoming ({upcomingBookings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="checkedin" className="rounded-xl font-black text-xs uppercase tracking-widest px-8">
            Checked In ({checkedInBookings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="past" className="rounded-xl font-black text-xs uppercase tracking-widest px-8">
            Past ({pastBookings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-xl font-black text-xs uppercase tracking-widest px-8">
            Cancelled ({cancelledBookings?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-0">
          <div className="grid gap-4">
            <BookingList
              bookings={upcomingBookings}
              loading={loading}
              onBookingClick={handleBookingClick}
              onNewBooking={() => router.push('/bookings/new')}
            />
          </div>
        </TabsContent>

        <TabsContent value="checkedin" className="mt-0">
          <div className="grid gap-4">
            <BookingList
              bookings={checkedInBookings}
              loading={loading}
              onBookingClick={handleBookingClick}
              onNewBooking={() => router.push('/bookings/new')}
            />
          </div>
        </TabsContent>

        <TabsContent value="past" className="mt-0">
          <div className="grid gap-4">
            <BookingList
              bookings={pastBookings}
              loading={loading}
              onBookingClick={handleBookingClick}
              onNewBooking={() => router.push('/bookings/new')}
            />
          </div>
        </TabsContent>

        <TabsContent value="cancelled" className="mt-0">
          <div className="grid gap-4">
            <BookingList
              bookings={cancelledBookings}
              loading={loading}
              onBookingClick={handleBookingClick}
              onNewBooking={() => router.push('/bookings/new')}
            />
          </div>
        </TabsContent>
      </Tabs>

    </div>
  )
}

function BookingList({
  bookings,
  loading,
  onBookingClick,
  onNewBooking
}: {
  bookings: any[] | undefined,
  loading: boolean,
  onBookingClick: (b: any) => void,
  onNewBooking: () => void
}) {
  return (
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
          bookings?.map((booking, i) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onBookingClick(booking)}
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
                              (r: any) => r.Room?.roomNumber,
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
                                : booking.status === 'CHECKED_OUT'
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'bg-slate-100 text-slate-400',
                          )}
                        >
                          {booking.status}
                        </Badge>
                      </div>

                      <div className="flex flex-col md:justify-end">
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-tighter mb-1">
                            Total Amount
                          </p>
                          <p className="text-2xl font-heading font-black tracking-tighter text-slate-900">
                            ₹{(booking.totalAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        {getTotalDue(booking) > 0 && (
                          <div className="text-right">
                            <p className="text-xs font-black text-red-400 uppercase tracking-tighter mb-1">
                              Due: ₹{getTotalDue(booking).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </AnimatePresence>

      {!loading && (!bookings || bookings.length === 0) && (
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
            onClick={onNewBooking}
            variant="outline"
            className="h-14 px-8 rounded-2xl border-slate-200 font-black tracking-tighter"
          >
            GENERATE NEW RESERVATION
          </Button>
        </div>
      )}
    </div>
  )
}

function getTotalDue(booking: Booking) {
  return (booking.totalAmount || 0) - (booking.Payment?.reduce((sum: number, p) => sum + (p.amount || 0), 0) || 0)
}
