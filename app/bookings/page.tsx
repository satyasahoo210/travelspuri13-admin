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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
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
import { cn } from '@/lib/utils'
import { gql, TypedDocumentNode } from '@apollo/client'
import { useApolloClient } from '@apollo/client/react'

type Booking = {
  id: string
  guestId: string
  propertyId: string
  tenantId: string
  checkInDate: string
  checkOutDate: string
  status: string
  source: string
  totalAmount: number | null
  createdAt: string | null
  updatedAt: string | null
  adults?: number | null
  children?: number | null
  discountAmount?: number | null
  discountType?: string | null
  notes?: string | null
  waiveLastDayCharge?: boolean | null
  actualCheckOut?: string | null
  Guest: {
    name: string
    phone: string | null
  } | null
  Property: {
    name: string
  } | null
  BookingRoom: Array<{
    Room: {
      roomNumber: string
    } | null
  }> | null
  Payment: Array<{ amount: number }> | null
}

interface GetBookingsData {
  syncBookings: {
    data: Booking[]
  }
}

const GET_BOOKINGS: TypedDocumentNode<GetBookingsData, { propertyId: string; since: string }> = gql`
  query GetBookings($propertyId: String!, $since: String) {
    syncBookings(propertyId: $propertyId, since: $since) {
      data {
        id
        guestId
        propertyId
        tenantId
        checkInDate
        checkOutDate
        status
        source
        totalAmount
        createdAt
        updatedAt
        adults
        children
        discountAmount
        discountType
        notes
        waiveLastDayCharge
        actualCheckOut
        Guest {
          id
          name
          phone
        }
        Property {
          id
          name
        }
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
  }
`;

const UPDATE_BOOKING = gql`
  mutation UpdateBooking($id: ID!, $input: UpdateBookingInput!) {
    updateBooking(id: $id, input: $input) {
      id
      status
      actualCheckOut
    }
  }
`;

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

  const client = useApolloClient()
  const { currentProperty } = useProperty()

  const fetchBookings = async () => {
    if (!currentProperty) return

    setLoading(true)
    try {
      const { data } = await client.query({
        query: GET_BOOKINGS,
        variables: { propertyId: currentProperty.id, since: "0" },
        fetchPolicy: 'network-only'
      })

      if (data && data.syncBookings) {
        const sortedBookings = [...data.syncBookings.data].sort((a, b) =>
          new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime()
        )
        setBookings(sortedBookings)
      }
    } catch (error) {
      console.error('Error fetching bookings via GQL:', error)
    } finally {
      setLoading(false)
    }
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
          className="w-full md:w-auto rounded-2xl h-14 px-8 bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all font-heading font-black tracking-tighter text-lg"
        >
          <Plus className="mr-3 h-6 w-6" />
          NEW BOOKING
        </Button>
      </header>

      <div className="flex flex-col sm:flex-row gap-4">
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
        <TabsList className="bg-slate-100 p-1 rounded-2xl h-auto min-h-[56px] mb-8 w-full justify-start overflow-x-auto scrollbar-none flex-nowrap">
          <TabsTrigger value="upcoming" className="rounded-xl font-black text-xs uppercase tracking-widest px-6 whitespace-nowrap shrink-0">
            Upcoming ({upcomingBookings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="checkedin" className="rounded-xl font-black text-xs uppercase tracking-widest px-6 whitespace-nowrap shrink-0">
            Checked In ({checkedInBookings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="past" className="rounded-xl font-black text-xs uppercase tracking-widest px-6 whitespace-nowrap shrink-0">
            Past ({pastBookings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-xl font-black text-xs uppercase tracking-widest px-6 whitespace-nowrap shrink-0">
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
  const client = useApolloClient()
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
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-row items-start md:items-center gap-4 md:gap-6">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-50 border border-slate-100 hidden sm:flex items-center justify-center shrink-0 group-hover:bg-primary/5 group-hover:border-primary/10 transition-colors">
                      <User className="h-5 w-5 md:h-6 md:w-6 text-slate-400 group-hover:text-primary" />
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 items-start md:items-center w-full">
                      <div className="space-y-1">
                        <p className="text-lg md:text-xl font-heading font-black tracking-tighter text-slate-900">
                          {booking.Guest?.name || 'Guest Not Found'}
                        </p>
                        <div className="flex items-center gap-2 text-slate-400">
                          <MapPin className="w-3 h-3" />
                          <span className="text-[10px] font-bold tracking-tight uppercase">
                            {booking.Property?.name}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start w-full">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <p className="text-sm font-black tracking-tight text-slate-900">
                            {format(new Date(booking.checkInDate), 'MMM d')} -{' '}
                            {format(new Date(booking.checkOutDate), 'MMM d')}
                          </p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest sm:ml-6">
                          {format(new Date(booking.checkOutDate), 'yyyy')}
                        </p>
                      </div>

                      <div className="flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-2 w-full">
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

                      <div className="flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end mt-2 md:mt-0 pt-4 md:pt-0 border-t border-slate-100 md:border-none w-full">
                        <div className="text-left md:text-right">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-tighter mb-1 hidden md:block">
                            Total Amount
                          </p>
                          <p className="text-xl md:text-2xl font-heading font-black tracking-tighter text-slate-900">
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

                        <div className="mt-3 w-full flex justify-end gap-2">
                          {(booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
                            <Button
                              size="sm"
                              className="w-full md:w-auto text-[10px] font-black tracking-widest uppercase rounded-xl bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20"
                              onClick={async (e) => {
                                e.stopPropagation()
                                await client.mutate({
                                  mutation: UPDATE_BOOKING,
                                  variables: { id: booking.id, input: { status: 'CHECKED_IN' } }
                                })
                                window.location.reload() // simple refresh
                              }}
                            >
                              Check In
                            </Button>
                          )}

                          {booking.status === 'CHECKED_IN' && getTotalDue(booking) > 0 && (
                            <Button
                              size="sm"
                              className="w-full md:w-auto text-[10px] font-black tracking-widest uppercase rounded-xl bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-500/20"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Navigate to details page to record payment
                                window.location.href = `/bookings/${booking.id}`
                              }}
                            >
                              Record Payment
                            </Button>
                          )}

                          {booking.status === 'CHECKED_IN' && getTotalDue(booking) <= 0 && (
                            <AlertDialog>
                              <AlertDialogTrigger render={
                                <Button
                                  size="sm"
                                  className="w-full md:w-auto text-[10px] font-black tracking-widest uppercase rounded-xl bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              }>
                                Check Out
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirm Check Out</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to check out this booking? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      await client.mutate({
                                        mutation: UPDATE_BOOKING,
                                        variables: { id: booking.id, input: { status: 'CHECKED_OUT', actualCheckOut: new Date().toISOString() } }
                                      })
                                      window.location.reload()
                                    }}
                                  >
                                    Confirm Check Out
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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

      {!loading && (!bookings || bookings.length === 0) && (
        <div className="text-center py-16 md:py-32 bg-white rounded-[3rem] border border-slate-200 shadow-sm">
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
