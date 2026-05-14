'use client'

import { CalendarGrid } from '@/components/calendar/calendar-grid'
import { useProperty } from '@/components/providers/property-provider'
import { Button } from '@/components/ui/button'
import { Tables } from '@/database.types'
import { createClient } from '@/lib/utils/supabase/client'
import { addDays, differenceInDays, format, startOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
} from 'lucide-react'
import { useEffect, useState } from 'react'

type RoomResp = Tables<'Room'> & {
  RoomType: Tables<'RoomType'>
}

export type BookingAssignment = Tables<'BookingRoom'> & {
  Booking: Tables<'Booking'> & {
    Guest: Pick<Tables<'Guest'>, 'name' | 'phone'>
    Property: Pick<Tables<'Property'>, 'timezone'>
  }
  Room: Pick<Tables<'Room'>, 'roomNumber'> | null
}

export default function CalendarPage() {
  const supabase = createClient()
  const { currentProperty } = useProperty()
  const [startDate, setStartDate] = useState(startOfDay(new Date()))
  const [rooms, setRooms] = useState<RoomResp[] | null>(null)
  const [assignments, setAssignments] = useState<BookingAssignment[] | null>(
    null,
  )
  const [fetching, setFetching] = useState(false)

  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  useEffect(() => {
    const fetchData = async () => {
      if (!currentProperty?.id) return

      setFetching(true)
      try {
        const [roomsRes, assignmentsRes] = await Promise.all([
          supabase
            .from('Room')
            .select('*, RoomType!inner(*)')
            .eq('RoomType.propertyId', currentProperty.id)
            .order('name', { referencedTable: 'RoomType' })
            .order('roomNumber'),
          supabase
            .from('BookingRoom')
            .select(
              '*, Booking!inner(*, Guest(name, phone), Property(timezone)), Room(roomNumber)',
            )
            .not('roomId', 'is', null) // Only fetch specific assignments
            .eq('Booking.propertyId', currentProperty.id),
        ])

        if (roomsRes.data) setRooms(roomsRes.data)
        if (assignmentsRes.data) setAssignments(assignmentsRes.data)
      } catch (err) {
        console.error('Error fetching calendar data:', err)
      } finally {
        setFetching(false)
      }
    }

    fetchData()
  }, [currentProperty?.id, supabase])

  const handlePrev = () => setStartDate((prev) => addDays(prev, -7))
  const handleNext = () => setStartDate((prev) => addDays(prev, 7))
  const handleToday = () => setStartDate(startOfDay(new Date()))

  const handleExport = () => {
    if (!assignments) return
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Guest Name,Phone,Room,Check-In,Check-Out,Total Days,Status\n' +
      assignments
        .map(
          (a) =>
            `"${a.Booking.Guest.name}","${a.Booking.Guest.phone}","${a.Room?.roomNumber || a.roomId}","${toZonedTime(a.checkInDate || a.Booking.checkInDate, a.Booking.Property.timezone)}","${toZonedTime(a.checkOutDate || a.Booking.checkOutDate, a.Booking.Property.timezone)}","${differenceInDays(a.checkOutDate || a.Booking.checkOutDate, a.checkInDate || a.Booking.checkInDate)}","${a.status || a.Booking.status}"`,
        )
        .join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `bookings_${format(new Date(), 'yyyy-MM-dd')}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredAssignments =
    assignments?.filter(
      (a) =>
        filterStatus === 'ALL' ||
        (a.status || a.Booking.status) === filterStatus,
    ) || []

  return (
    <div className="p-4 md:p-8 max-w-400 mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-heading font-extrabold tracking-tight">
            Occupancy Grid
          </h2>
          <p className="text-muted-foreground text-sm">
            Real-time room availability and reservation timeline.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="rounded-xl hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
            className="px-4 font-bold text-xs uppercase tracking-widest hover:bg-primary/5 hover:text-primary"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="rounded-xl hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex items-center border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white h-11">
            <div className="px-3 text-slate-400">
              <Filter className="h-4 w-4" />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-[11px] px-3 outline-none font-black uppercase tracking-widest text-slate-700 pr-6 appearance-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            className="rounded-2xl border-slate-200 shadow-sm hover:bg-slate-50 h-11 px-6 font-black text-[11px] uppercase tracking-widest"
          >
            <Download className="mr-2 h-4 w-4 text-primary" />
            Export CSV
          </Button>
        </div>
      </header>

      {rooms && assignments && !fetching ? (
        <CalendarGrid
          rooms={rooms}
          bookings={filteredAssignments}
          startDate={startDate}
        />
      ) : (
        <div className="h-125 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <div className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
            Optimizing Grid View...
          </div>
        </div>
      )}
    </div>
  )
}
