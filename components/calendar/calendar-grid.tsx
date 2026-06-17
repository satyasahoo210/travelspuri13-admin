'use client'

import type { BookingAssignment } from '@/app/calendar/page'
import { BookingForm } from '@/components/bookings/booking-form'
import { useProperty } from '@/components/providers/property-provider'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tables } from '@/database.types'
import { cn } from '@/lib/utils'
import {
  addDays,
  differenceInDays,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfDay,
} from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar, Home, Phone, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

interface CalendarGridProps {
  rooms: any[]
  bookings: BookingAssignment[]
  startDate?: Date
}

export function CalendarGrid({
  rooms,
  bookings: assignments,
  startDate = startOfDay(new Date()),
}: CalendarGridProps) {
  const { currentProperty } = useProperty()

  const [viewDays] = useState(7)
  const [selectedAssignment, setSelectedAssignment] =
    useState<BookingAssignment | null>(null)
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string | null>(
    null,
  )

  const [isCreatingBooking, setIsCreatingBooking] = useState(false)
  const [newBookingData, setNewBookingData] = useState<{
    roomId?: string
    checkIn?: string
    checkOut?: string
  }>()
  const [rangeStart, setRangeStart] = useState<{
    roomId: string
    date: Date
  } | null>(null)

  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startDate,
      end: addDays(startDate, viewDays - 1),
    })
  }, [startDate, viewDays])

  const defaultCheckInTime = useMemo(() => {
    const settings = (() => {
      if (!currentProperty?.settings) return null
      try {
        return typeof currentProperty.settings === 'string'
          ? JSON.parse(currentProperty.settings)
          : currentProperty.settings
      } catch {
        return null
      }
    })()
    const propCheckInTime = settings?.checkinTime
      ? `${settings.checkinTime}`
      : (currentProperty?.checkInTime || '07:00:00')
    return propCheckInTime;
  }, [currentProperty])

  const defaultCheckOutTime = useMemo(() => {
    const settings = (() => {
      if (!currentProperty?.settings) return null
      try {
        return typeof currentProperty.settings === 'string'
          ? JSON.parse(currentProperty.settings)
          : currentProperty.settings
      } catch {
        return null
      }
    })()
    const propCheckOutTime = settings?.checkoutTime
      ? `${settings.checkoutTime}`
      : (currentProperty?.checkOutTime || '07:00:00')
    return propCheckOutTime;
  }, [currentProperty])

  return (
    <>
      <div className="flex flex-col border border-slate-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/50">
        {/* Header */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <div className="w-32 shrink-0 p-6 border-r border-slate-100 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center justify-center text-center">
            Room
            <br />
            Registry
          </div>
          <div className="flex-1 grid grid-cols-7 overflow-hidden">
            {days.map((day) => (
              <div
                key={day.toString()}
                className="p-6 text-center border-r border-slate-100 last:border-r-0"
              >
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                  {format(day, 'EEE')}
                </p>
                <p className="text-2xl font-heading font-black tracking-tighter text-slate-900">
                  {format(day, 'dd')}
                </p>
                <p className="text-[10px] text-primary font-black uppercase tracking-tighter">
                  {format(day, 'MMM')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Grid Content */}
        <div className="overflow-y-auto max-h-[700px] scrollbar-none">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex border-b border-slate-50 last:border-b-0 group transition-colors hover:bg-slate-50/30"
            >
              {/* Room Info */}
              <div className="w-32 shrink-0 p-6 border-r border-slate-100 flex flex-col items-center justify-center group-hover:bg-slate-50 transition-colors relative z-10 bg-white">
                <p className="text-2xl font-heading font-black tracking-tighter text-primary">
                  {room.roomNumber}
                </p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {room.RoomType.name}
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[8px] h-4 scale-90 px-2 font-black uppercase tracking-tighter border-none',
                    room.status === 'AVAILABLE'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-amber-50 text-amber-600',
                  )}
                >
                  {room.status}
                </Badge>
              </div>

              {/* Timeline */}
              <div className="flex-1 grid grid-cols-7 relative h-32">
                {days.map((day) => {
                  const isStart =
                    rangeStart?.roomId === room.id &&
                    rangeStart?.date &&
                    isSameDay(rangeStart.date, day)
                  const isInRange =
                    rangeStart?.roomId === room.id &&
                    rangeStart && day > rangeStart.date &&
                    newBookingData?.roomId === room.id &&
                    newBookingData?.checkOut &&
                    day < new Date(newBookingData.checkOut)

                  return (
                    <div
                      key={day.toString()}
                      className={cn(
                        'border-r border-slate-50 last:border-r-0 cursor-pointer transition-all relative group/cell',
                        isStart ? 'bg-primary/10' : 'hover:bg-primary/5',
                      )}
                      onClick={() => {
                        if (!rangeStart || rangeStart.roomId !== room.id) {
                          setRangeStart({ roomId: room.id, date: day })
                          setNewBookingData({
                            roomId: room.id,
                            checkIn: formatInTimeZone(day, currentProperty?.timezone ?? 'Asia/Kolkata', `yyyy-MM-dd'T'${defaultCheckInTime}`),
                          })
                        } else {
                          // Second click
                          if (isSameDay(rangeStart.date, day)) {
                            // Reset if same day
                            setRangeStart(null)
                            setNewBookingData(undefined)
                          } else if (day > rangeStart.date) {
                            // Valid range
                            setNewBookingData({
                              roomId: room.id,
                              checkIn: formatInTimeZone(rangeStart.date, currentProperty?.timezone ?? 'Asia/Kolkata', `yyyy-MM-dd'T'${defaultCheckInTime}`),
                              checkOut: formatInTimeZone(day, currentProperty?.timezone ?? 'Asia/Kolkata', `yyyy-MM-dd'T'${defaultCheckOutTime}`),
                            })
                            setIsCreatingBooking(true)
                            setRangeStart(null)
                          } else {
                            // Earlier date, reset start
                            setRangeStart({ roomId: room.id, date: day })
                            setNewBookingData({
                              roomId: room.id,
                              checkIn: formatInTimeZone(day, currentProperty?.timezone ?? 'Asia/Kolkata', `yyyy-MM-dd'T'${defaultCheckInTime}`),
                            })
                          }
                        }
                      }}
                    >
                      {isStart && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-[8px] font-black uppercase text-primary animate-pulse">
                            Select Checkout
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Bookings on this room */}
                <div className="absolute inset-0 pointer-events-none p-2">
                  {assignments
                    .filter((a) => a.roomId === room.id)
                    .map((assignment) => {
                      // Fallback logic for dates: Assignment dates -> Folio dates
                      const checkIn = startOfDay(
                        new Date(
                          assignment.checkInDate ||
                          assignment.Booking.checkInDate,
                        ),
                      )
                      const checkOut = startOfDay(
                        new Date(
                          assignment.checkOutDate ||
                          assignment.Booking.checkOutDate,
                        ),
                      )

                      if (
                        checkOut <= startDate ||
                        checkIn >= addDays(startDate, viewDays)
                      )
                        return null

                      const startOffset = Math.max(
                        0,
                        differenceInDays(checkIn, startDate),
                      )
                      const durationInView = differenceInDays(
                        new Date(
                          Math.min(
                            checkOut.getTime(),
                            addDays(startDate, viewDays).getTime(),
                          ),
                        ),
                        new Date(
                          Math.max(checkIn.getTime(), startDate.getTime()),
                        ),
                      )

                      if (durationInView <= 0) return null

                      const status =
                        assignment.status || assignment.Booking.status

                      return (
                        <motion.div
                          key={assignment.id}
                          layoutId={assignment.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={() => {
                            setSelectedAssignment(assignment)
                            setSelectedRoomNumber(room.roomNumber)
                          }}
                          className="absolute bottom-2 pointer-events-auto cursor-pointer group/booking"
                          style={{
                            left: `${(startOffset / 7) * 100}%`,
                            width: `${(durationInView / 7) * 100}%`,
                            height: 'calc(100% - 16px)',
                          }}
                        >
                          <div
                            className={cn(
                              'h-full mx-1 rounded-2xl p-3 flex flex-col justify-center border shadow-sm transition-all group-hover/booking:shadow-md group-hover/booking:scale-[1.02] relative overflow-hidden',
                              status === 'CONFIRMED'
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-900'
                                : status === 'CHECKED_IN'
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-950'
                                  : status === 'CHECKED_OUT'
                                    ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 line-through'
                                    : status === 'CANCELLED'
                                      ? 'bg-rose-50 border-rose-100 text-rose-900 opacity-60'
                                      : status === 'NO_SHOW'
                                        ? 'bg-amber-50 border-amber-100 text-amber-900'
                                        : 'bg-slate-100 border-slate-200 text-slate-900',
                            )}
                          >
                            <div className="absolute top-0 right-0 p-1 opacity-20 group-hover/booking:opacity-40 transition-opacity">
                              <Calendar className="w-8 h-8 -rotate-12" />
                            </div>
                            <p className="text-[11px] font-black tracking-tighter truncate uppercase">
                              {assignment.Booking.Guest.name}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <p className="text-[9px] font-black opacity-60 tracking-widest uppercase">
                                {format(checkIn, 'dd MMM')}
                              </p>
                              <ArrowRight className="w-2 h-2 opacity-30" />
                              <p className="text-[9px] font-black opacity-60 tracking-widest uppercase">
                                {format(checkOut, 'dd MMM')}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignment Details Dialog */}
      <Dialog
        open={!!selectedAssignment}
        onOpenChange={(open) => !open && setSelectedAssignment(null)}
      >
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary p-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Calendar className="w-32 h-32 rotate-12" />
            </div>
            <DialogHeader className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-black uppercase tracking-widest text-[9px]">
                  {selectedAssignment?.status ||
                    selectedAssignment?.Booking.status}
                </Badge>
                {selectedAssignment?.priceOverride && (
                  <Badge className="bg-amber-400 text-amber-900 border-none font-black uppercase tracking-widest text-[9px]">
                    Price Adjusted
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-4xl font-heading font-black tracking-tighter leading-none mb-2">
                {selectedAssignment?.Booking.Guest.name}
              </DialogTitle>
              <DialogDescription className="text-white/70 font-bold uppercase tracking-widest text-[10px]">
                Relational Folio Assignment
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-8 bg-white">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-400">
                  <Home className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Room Selection
                  </span>
                </div>
                <p className="text-2xl font-heading font-black tracking-tighter text-slate-900">
                  Room {selectedRoomNumber}
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-400">
                  <Users className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Occupants
                  </span>
                </div>
                <p className="text-lg font-bold text-slate-900 truncate">
                  {selectedAssignment?.Booking.adults} Adults,{' '}
                  {selectedAssignment?.Booking.children} Kids
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex items-center justify-between">
              <div className="text-center flex-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Check In
                </span>
                <p className="text-lg font-black text-slate-900 tracking-tighter">
                  {selectedAssignment
                    ? format(
                      new Date(
                        selectedAssignment.checkInDate ||
                        selectedAssignment.Booking.checkInDate,
                      ),
                      'dd MMM yyyy',
                    )
                    : ''}
                </p>
              </div>
              <div className="px-4 text-slate-200">
                <ArrowRight className="w-6 h-6 rotate-12" />
              </div>
              <div className="text-center flex-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Check Out
                </span>
                <p className="text-lg font-black text-slate-900 tracking-tighter">
                  {selectedAssignment
                    ? format(
                      new Date(
                        selectedAssignment.checkOutDate ||
                        selectedAssignment.Booking.checkOutDate,
                      ),
                      'dd MMM yyyy',
                    )
                    : ''}
                </p>
              </div>
            </div>

            {selectedAssignment?.Booking.notes && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block mb-1 italic">
                  Folio Notes
                </span>
                <p className="text-xs font-bold text-amber-900/70 leading-relaxed capitalize">
                  {selectedAssignment.Booking.notes}
                </p>
              </div>
            )}

            <div className="pt-4 flex flex-col gap-3">
              <a
                href={`tel:${selectedAssignment?.Booking.Guest.phone}`}
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  'w-full h-16 rounded-2xl bg-primary shadow-xl shadow-primary/20 font-heading font-black tracking-tighter text-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-3 text-white',
                )}
              >
                <Phone className="w-5 h-5" />
                CALL PRIMARY GUEST
              </a>
              <Button
                variant="default"
                onClick={() => {
                  window.location.href = `/bookings/${selectedAssignment?.bookingId}`
                }}
                className="w-full h-16 rounded-2xl bg-slate-900 shadow-xl shadow-slate-900/10 font-heading font-black tracking-tighter text-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-3 text-white"
              >
                <ArrowRight className="w-5 h-5" />
                MANAGE BOOKING
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedAssignment(null)}
                className="w-full h-14 rounded-2xl border-slate-200 font-heading font-black tracking-tighter text-lg hover:bg-slate-50 transition-colors"
              >
                CLOSE PREVIEW
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Booking Sheet */}
      <Sheet open={isCreatingBooking} onOpenChange={setIsCreatingBooking}>
        <SheetContent
          side="right"
          className="sm:max-w-xl bg-white border-l p-0 flex flex-col h-full shadow-2xl overflow-y-auto"
        >
          <SheetHeader className="p-8 border-b border-slate-100 shrink-0">
            <SheetTitle className="text-3xl font-heading font-black tracking-tighter">
              New Booking
            </SheetTitle>
          </SheetHeader>
          <div className="p-8">
            {isCreatingBooking && (
              <BookingForm
                initialData={newBookingData}
                onSuccess={(id) => {
                  setIsCreatingBooking(false)
                  window.location.href = `/bookings/${id}`
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
