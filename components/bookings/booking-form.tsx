import { useAuth } from '@/components/providers/auth-provider'
import { useProperty } from '@/components/providers/property-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tables } from '@/database.types'
import { PAYMENT_METHODS } from '@/lib/constants'
import { createClient } from '@/lib/utils/supabase/client'
import { differenceInCalendarDays, format } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { AlertTriangle, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, DollarSign, Home, Loader2, Search, ShieldCheck, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'

type Guest = Pick<Tables<'Guest'>, 'id' | 'name' | 'phone'>
type Room = Pick<Tables<'Room'>, 'id' | 'roomNumber' | 'roomTypeId' | 'status'> & {
  RoomType: Pick<Tables<'RoomType'>, 'propertyId' | 'defaultPrice' | 'name'> | null
}

export function BookingForm({
  onSuccess,
  initialData,
}: {
  onSuccess?: (id: string) => void
  initialData?: {
    roomId?: string
    checkIn?: string
    checkOut?: string
  }
}) {
  const supabase = createClient()
  const { user } = useAuth()
  const { currentProperty } = useProperty()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [guests, setGuests] = useState<Guest[]>([])
  const [rooms, setRooms] = useState<Room[]>([])

  const [isQuickAddGuest, setIsQuickAddGuest] = useState(false)
  const [quickGuest, setQuickGuest] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    idProofType: 'Aadhar Card',
    idProofNumber: '',
    idProofFile: null as File | null,
  })

  const [formData, setFormData] = useState({
    guestId: '',
    checkIn: initialData?.checkIn || '',
    checkOut: initialData?.checkOut || '',
    adults: '1',
    children: '0',
    notes: '',
    waiveLastDayCharge: false,
  })

  const [selectedRooms, setSelectedRooms] = useState<string[]>(
    initialData?.roomId ? [initialData.roomId] : []
  )
  const [roomRates, setRoomRates] = useState<Record<string, string>>({})
  const [advanceAmount, setAdvanceAmount] = useState('0')

  const getSafeRate = (roomId: string): string | undefined => {
    if (!roomId || typeof roomId !== 'string') return undefined
    if (roomId === '__proto__' || roomId === 'constructor' || roomId === 'prototype') {
      return undefined
    }
    if (Object.prototype.hasOwnProperty.call(roomRates, roomId)) {
      const val = Reflect.get(roomRates, roomId)
      return typeof val === 'string' ? val : undefined
    }
    return undefined
  }
  const [advanceMethod, setAdvanceMethod] = useState('CASH')

  const [roomSearchQuery, setRoomSearchQuery] = useState('')
  const [collapsedRoomTypes, setCollapsedRoomTypes] = useState<Record<string, boolean>>({})
  const [activeBookings, setActiveBookings] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!currentProperty?.id) return

      const { data: guestData } = await supabase
        .from('Guest')
        .select('id, name, phone')
        .order('name')
      const { data: roomData } = await supabase
        .from('Room')
        .select('id, roomNumber, roomTypeId, status, RoomType!inner(propertyId, defaultPrice, name)')
        .eq('RoomType.propertyId', currentProperty.id)

      if (guestData) setGuests(guestData)
      if (roomData) setRooms(roomData as any)
    }

    fetchData()
  }, [currentProperty?.id])

  useEffect(() => {
    const fetchActiveBookings = async () => {
      if (!currentProperty?.id) return
      const { data } = await supabase
        .from('BookingRoom')
        .select(`
          id,
          roomId,
          checkInDate,
          checkOutDate,
          Booking!inner(id, status, checkInDate, checkOutDate)
        `)
        .eq('Booking.propertyId', currentProperty.id)
        .neq('Booking.status', 'CANCELLED')
        .neq('Booking.status', 'CHECKED_OUT')

      if (data) {
        setActiveBookings(data)
      }
    }
    fetchActiveBookings()
  }, [currentProperty?.id])

  const getRoomOverbookingStay = (roomId: string) => {
    console.log(roomId)
    if (!formData.checkIn || !formData.checkOut || !currentProperty) return null

    const checkinTime = currentProperty.settings?.checkinTime || "08:00"
    const checkoutTime = currentProperty.settings?.checkoutTime || "07:00"
    let selStart: Date
    let selEnd: Date
    if (currentProperty.timezone) {
      selStart = fromZonedTime(formData.checkIn, currentProperty.timezone)
      selEnd = fromZonedTime(formData.checkOut, currentProperty.timezone)
    } else {
      selStart = new Date(formData.checkIn)
      selEnd = new Date(formData.checkOut)
    }

    return activeBookings.find(stay => {
      if (stay.roomId !== roomId) return false

      const startVal = stay.checkInDate || stay.Booking?.checkInDate
      const endVal = stay.checkOutDate || stay.Booking?.checkOutDate
      if (!startVal || !endVal) return false

      const stayStart = new Date(startVal)
      const stayEnd = new Date(endVal)

      return stayStart < selEnd && stayEnd > selStart
    })
  }

  // Get nights count
  const getNights = () => {
    if (!formData.checkIn || !formData.checkOut || !currentProperty) return 0
    const start = new Date(formData.checkIn)
    const end = new Date(formData.checkOut)

    let nights = differenceInCalendarDays(end, start)
    const checkOutTimeStr = format(end, 'HH:mm:ss')
    const propCheckOutTime = currentProperty.settings?.checkoutTime
      ? `${currentProperty.settings.checkoutTime}:00`
      : (currentProperty.checkOutTime || '07:00:00')

    if (checkOutTimeStr > propCheckOutTime) {
      nights += 1
    }

    if (formData.waiveLastDayCharge) {
      nights -= 1
    }

    return Math.max(1, nights)
  }

  // Calculate Subtotal, Taxes, Total Amount
  const getPricingSummary = () => {
    const nights = getNights()
    let subtotal = 0

    selectedRooms.forEach((roomId) => {
      const room = rooms.find((r) => r.id === roomId)
      if (room) {
        const customRate = getSafeRate(roomId)
        const rate = customRate
          ? parseFloat(customRate)
          : (Number(room.RoomType?.defaultPrice) || 0)
        subtotal += rate * nights
      }
    })

    const taxEnabled = currentProperty?.settings?.defaultTaxEnabled !== false
    const taxRate = currentProperty?.settings?.taxAmount ?? currentProperty?.taxPercentage ?? 0
    const taxVal = taxEnabled ? subtotal * (taxRate / 100) : 0
    const totalAmount = subtotal + taxVal

    return {
      nights,
      subtotal,
      taxVal,
      totalAmount,
    }
  }

  const pricing = getPricingSummary()

  // Filter out maintenance and search query
  const bookableRooms = rooms.filter((r) => r.status !== 'MAINTENANCE')
  const filteredRooms = bookableRooms.filter((r) => {
    const query = roomSearchQuery.toLowerCase()
    return (
      r.roomNumber.toLowerCase().includes(query) ||
      (r.RoomType?.name || '').toLowerCase().includes(query)
    )
  })

  // Room type grouping
  const roomsByRoomType = filteredRooms.reduce((acc, room) => {
    const typeName = room.RoomType?.name || 'Standard'
    if (!acc[typeName]) acc[typeName] = []
    acc[typeName].push(room)
    return acc
  }, {} as Record<string, Room[]>)

  // Sort room numbers numerically
  Object.keys(roomsByRoomType).forEach((typeName) => {
    roomsByRoomType[typeName].sort((a, b) =>
      a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' })
    )
  })

  const handleSelectAllRoomType = (typeName: string, typeRooms: Room[]) => {
    const typeRoomIds = typeRooms.map((r) => r.id)
    const allSelected = typeRoomIds.every((id) => selectedRooms.includes(id))
    if (allSelected) {
      setSelectedRooms((prev) => prev.filter((id) => !typeRoomIds.includes(id)))
    } else {
      setSelectedRooms((prev) => Array.from(new Set([...prev, ...typeRoomIds])))
    }
  }

  const toggleCollapse = (typeName: string) => {
    setCollapsedRoomTypes((prev) => ({
      ...prev,
      [typeName]: !prev[typeName],
    }))
  }

  const isStepValid = () => {
    if (step === 1) {
      return (
        formData.checkIn !== '' &&
        formData.checkOut !== '' &&
        new Date(formData.checkOut) >= new Date(formData.checkIn) &&
        parseInt(formData.adults) >= 1
      )
    }
    if (step === 2) {
      return selectedRooms.length > 0
    }
    if (step === 4) {
      if (isQuickAddGuest) {
        return quickGuest.name !== ''
      }
      return formData.guestId !== ''
    }
    return true
  }

  const handleNext = () => {
    if (isStepValid()) {
      setStep(step + 1)
    }
  }

  const handlePrev = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!user?.tenantId || !currentProperty?.id) return

    setLoading(true)
    try {
      let finalGuestId = formData.guestId

      if (isQuickAddGuest) {
        let idProofUrl = null
        if (quickGuest.idProofFile && quickGuest.idProofFile.size > 0) {
          const fileExt = quickGuest.idProofFile.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from('guests')
              .upload(fileName, quickGuest.idProofFile)
          if (uploadError) throw uploadError
          idProofUrl = uploadData.path
        }

        const { data: newGuest, error: guestError } = await supabase
          .from('Guest')
          .insert([
            {
              name: quickGuest.name,
              phone: quickGuest.phone,
              email: quickGuest.email,
              address: quickGuest.address,
              idProofType: quickGuest.idProofType,
              idProofNumber: quickGuest.idProofNumber,
              idProofUrl: idProofUrl,
              tenantId: user.tenantId,
            },
          ])
          .select()
          .single()

        if (guestError) throw guestError
        finalGuestId = newGuest.id
      }

      const checkinTime = currentProperty?.settings?.checkinTime || "08:00"
      const checkoutTime = currentProperty?.settings?.checkoutTime || "07:00"

      // Timezone parsing
      let checkInDateStr = formData.checkIn + " " + checkinTime
      let checkOutDateStr = formData.checkOut + " " + checkoutTime

      if (currentProperty.timezone) {
        const timeZone = currentProperty.timezone
        checkInDateStr = fromZonedTime(formData.checkIn, timeZone).toISOString()
        checkOutDateStr = fromZonedTime(formData.checkOut, timeZone).toISOString()
      } else {
        checkInDateStr = new Date(formData.checkIn).toISOString()
        checkOutDateStr = new Date(formData.checkOut).toISOString()
      }

      // 1. Create the Master Booking (Folio)
      const { data: booking, error: bError } = await supabase
        .from('Booking')
        .insert([
          {
            guestId: finalGuestId,
            propertyId: currentProperty.id,
            tenantId: user.tenantId,
            checkInDate: checkInDateStr,
            checkOutDate: checkOutDateStr,
            adults: parseInt(formData.adults),
            children: parseInt(formData.children),
            totalAmount: pricing.totalAmount,
            notes: formData.notes,
            waiveLastDayCharge: formData.waiveLastDayCharge,
            status: 'CONFIRMED',
          },
        ])
        .select()
        .single()

      if (bError) throw bError

      // 2. Create Relational Room Assignments (BookingRoom) for each selected room
      for (const roomId of selectedRooms) {
        const selectedRoom = rooms.find((r) => r.id === roomId)
        if (selectedRoom) {
          const customRate = getSafeRate(roomId)
          const overrideRate = customRate ? parseFloat(customRate) : null
          const { error: brError } = await supabase.from('BookingRoom').insert([
            {
              bookingId: booking.id,
              roomId,
              roomTypeId: selectedRoom.roomTypeId,
              priceOverride: overrideRate,
              status: 'CONFIRMED',
            },
          ])

          if (brError) throw brError
        }
      }

      // 3. Create Advance Payment (Optional)
      const advAmt = parseFloat(advanceAmount)
      if (advAmt > 0) {
        const { error: pError } = await supabase.from('Payment').insert([
          {
            bookingId: booking.id,
            tenantId: user.tenantId,
            amount: advAmt,
            method: advanceMethod,
            status: pricing.totalAmount <= advAmt ? 'PAID' : 'PARTIAL',
            notes: 'Advance Booking Payment',
          },
        ])

        if (pError) throw pError
      }

      if (onSuccess) onSuccess(booking.id)
    } catch (err) {
      console.error('Error creating booking:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[75vh] max-h-[75vh]">
      {/* Step Indicator */}
      <div className="flex items-center justify-between px-2 mb-6 select-none shrink-0">
        {[1, 2, 3, 4, 5, 6].map((s) => {
          const isCurrent = step === s
          const isCompleted = step > s
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 ${isCurrent
                ? 'bg-slate-900 text-white ring-4 ring-slate-100'
                : isCompleted
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-400'
                }`}>
                {s}
              </div>
              {s < 6 && (
                <div className={`h-1 flex-1 mx-2 rounded-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-100'
                  }`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Wizard Steps (Scrollable Content Area) */}
      <div className="flex-1 overflow-y-auto space-y-6 px-1 pb-4 scrollbar-none">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6">

          {/* Step 1: Dates & Guests */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="p-2 bg-slate-900/10 rounded-xl text-slate-900">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tighter text-slate-900">Step 1: Select Dates & Guests</p>
                  <p className="text-[10px] text-slate-400 font-bold">Specify your gueststay details</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Check-in</Label>
                  <Input
                    type="datetime-local"
                    required
                    className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100"
                    value={formData.checkIn}
                    onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Check-out</Label>
                  <Input
                    type="datetime-local"
                    required
                    className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100"
                    value={formData.checkOut}
                    onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Adults</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100"
                    value={formData.adults}
                    onChange={(e) => setFormData({ ...formData, adults: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Children</Label>
                  <Input
                    type="number"
                    min="0"
                    required
                    className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100"
                    value={formData.children}
                    onChange={(e) => setFormData({ ...formData, children: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 py-2">
                <input
                  type="checkbox"
                  id="waiveLastDayCharge"
                  checked={formData.waiveLastDayCharge}
                  onChange={(e) => setFormData({ ...formData, waiveLastDayCharge: e.target.checked })}
                  className="w-5 h-5 accent-primary cursor-pointer"
                />
                <Label htmlFor="waiveLastDayCharge" className="cursor-pointer font-bold text-slate-700">Waive Last Day Charge</Label>
              </div>
            </div>
          )}

          {/* Step 2: Select Rooms */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="p-2 bg-slate-900/10 rounded-xl text-slate-900">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tighter text-slate-900">Step 2: Select Rooms</p>
                  <p className="text-[10px] text-slate-400 font-bold">Select one or more available rooms</p>
                </div>
              </div>

              {/* Room Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by Room Number or Type..."
                  className="pl-12! h-12 rounded-xl border-slate-100 bg-slate-50 text-sm font-bold"
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-6">
                {Object.keys(roomsByRoomType).length === 0 ? (
                  <p className="text-sm font-bold text-slate-400 text-center py-8">No matching rooms available.</p>
                ) : (
                  Object.entries(roomsByRoomType).map(([typeName, typeRooms]) => {
                    const isCollapsed = collapsedRoomTypes[typeName]
                    const typeRoomIds = typeRooms.map((r) => r.id)
                    const allSelected = typeRoomIds.every((id) => selectedRooms.includes(id))

                    return (
                      <div key={typeName} className="space-y-3 border border-slate-100 rounded-2xl p-4 bg-slate-50/30">
                        <div className="flex items-center justify-between select-none">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => toggleCollapse(typeName)}
                          >
                            {isCollapsed ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronUp className="w-4 h-4 text-indigo-500" />}
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                              {typeName} ({typeRooms.length})
                            </h4>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleSelectAllRoomType(typeName, typeRooms)}
                            className="h-8 rounded-lg font-black text-[9px] uppercase tracking-wider text-slate-500 hover:text-indigo-600"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>

                        {!isCollapsed && (
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            {typeRooms.map((room) => {
                              const isSelected = selectedRooms.includes(room.id)
                              const overlapStay = getRoomOverbookingStay(room.id)

                              return (
                                <div
                                  key={room.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedRooms(selectedRooms.filter((id) => id !== room.id))
                                    } else {
                                      setSelectedRooms([...selectedRooms, room.id])
                                    }
                                  }}
                                  className={`p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between gap-3 ${isSelected
                                    ? 'border-slate-900 bg-slate-50/50'
                                    : 'border-slate-100 hover:border-slate-200 bg-white'
                                    }`}
                                >
                                  <div className="flex justify-between items-start w-full">
                                    <div>
                                      <p className="text-lg font-black text-slate-900">Room {room.roomNumber}</p>
                                      <p className="text-[10px] font-bold text-slate-400">₹{room.RoomType?.defaultPrice}/night</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-300'
                                      }`}>
                                      {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                  </div>
                                  {overlapStay && (
                                    <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2 mt-1">
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                      <p className="text-[9px] font-black uppercase tracking-tight leading-normal">
                                        Already Booked
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Step 3: Override prices & discounts */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="p-2 bg-slate-900/10 rounded-xl text-slate-900">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tighter text-slate-900">Step 3: Override Prices</p>
                  <p className="text-[10px] text-slate-400 font-bold">Customize pricing details for each selected room</p>
                </div>
              </div>

              <div className="space-y-4">
                {selectedRooms.map((roomId) => {
                  const room = rooms.find((r) => r.id === roomId)
                  if (!room) return null
                  return (
                    <div key={roomId} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-black text-slate-900">Room {room.roomNumber}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{room.RoomType?.name}</p>
                        </div>
                        <p className="text-xs font-bold text-slate-400">Default: ₹{room.RoomType?.defaultPrice}/night</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Custom Rate / Night (₹)</Label>
                        <Input
                          type="number"
                          placeholder="Leave empty for default"
                          className="h-12 rounded-xl bg-white"
                          value={getSafeRate(roomId) || ''}
                          onChange={(e) => setRoomRates({ ...roomRates, [roomId]: e.target.value })}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 4: Collect guest details */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-900/10 rounded-xl text-slate-900">
                    {isQuickAddGuest ? <UserPlus className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tighter text-slate-900">Step 4: Guest Details</p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {isQuickAddGuest ? 'Create new guest' : 'Select from existing'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant={isQuickAddGuest ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsQuickAddGuest(!isQuickAddGuest)}
                  className="rounded-xl font-black text-[10px] tracking-widest uppercase h-8"
                >
                  {isQuickAddGuest ? 'Search Existing' : 'Add New Guest'}
                </Button>
              </div>

              {isQuickAddGuest ? (
                <div className="space-y-4 p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Guest Name</Label>
                    <Input
                      required
                      className="h-12 rounded-xl"
                      value={quickGuest.name}
                      onChange={(e) => setQuickGuest({ ...quickGuest, name: e.target.value })}
                      placeholder="Full Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone</Label>
                    <Input
                      className="h-12 rounded-xl"
                      value={quickGuest.phone}
                      onChange={(e) => setQuickGuest({ ...quickGuest, phone: e.target.value })}
                      placeholder="+91 xxxxx xxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</Label>
                    <Input
                      type="email"
                      className="h-12 rounded-xl"
                      value={quickGuest.email}
                      onChange={(e) => setQuickGuest({ ...quickGuest, email: e.target.value })}
                      placeholder="guest@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Address</Label>
                    <Input
                      className="h-12 rounded-xl"
                      value={quickGuest.address}
                      onChange={(e) => setQuickGuest({ ...quickGuest, address: e.target.value })}
                      placeholder="Full Address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ID Proof Type</Label>
                      <Select
                        value={quickGuest.idProofType}
                        onValueChange={(v) => setQuickGuest({ ...quickGuest, idProofType: v || '' })}
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                          <SelectItem value="Aadhar Card">Aadhar Card</SelectItem>
                          <SelectItem value="PAN Card">PAN Card</SelectItem>
                          <SelectItem value="Passport">Passport</SelectItem>
                          <SelectItem value="Driving License">Driving License</SelectItem>
                          <SelectItem value="Voter ID">Voter ID</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ID Proof Number</Label>
                      <Input
                        className="h-12 rounded-xl"
                        value={quickGuest.idProofNumber}
                        onChange={(e) => setQuickGuest({ ...quickGuest, idProofNumber: e.target.value })}
                        placeholder="Enter Details"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ID Proof Document (Optional)</Label>
                    <Input
                      type="file"
                      className="h-12 rounded-xl"
                      accept="image/*,.pdf"
                      onChange={(e) => setQuickGuest({ ...quickGuest, idProofFile: e.target.files?.[0] || null })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Guest</Label>
                  <SearchableCombobox
                    options={guests.map((g) => ({
                      value: g.id,
                      label: `${g.name} ${g.phone ? `(${g.phone})` : ''}`,
                    }))}
                    value={formData.guestId}
                    onChange={(v) => setFormData({ ...formData, guestId: v })}
                    placeholder="Search Guest..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 5: Advance Payment */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="p-2 bg-slate-900/10 rounded-xl text-slate-900">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tighter text-slate-900">Step 5: Advance Payment</p>
                  <p className="text-[10px] text-slate-400 font-bold">Record optional advance payment</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Advance Amount (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Method</Label>
                  <Select value={advanceMethod} onValueChange={(v) => setAdvanceMethod(v || 'CASH')}>
                    <SelectTrigger className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value} className="rounded-xl font-bold">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Booking Notes (Optional)</Label>
                <Input
                  className="h-12 rounded-xl"
                  placeholder="Special requests, flight details, etc."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step 6: Summary & Confirmation */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tighter text-slate-900">Step 6: Summary & Confirmation</p>
                  <p className="text-[10px] text-slate-400 font-bold">Review information before confirmation</p>
                </div>
              </div>

              <div className="space-y-4 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Guest Details</p>
                    <p className="font-black text-slate-900 text-sm">
                      {isQuickAddGuest ? quickGuest.name : guests.find((g) => g.id === formData.guestId)?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Stay Duration</p>
                    <p className="font-black text-slate-900 text-sm">{pricing.nights} Nights</p>
                  </div>
                </div>

                <div className="space-y-3 pb-4 border-b border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Selected Rooms</p>
                  {selectedRooms.map((roomId) => {
                    const room = rooms.find((r) => r.id === roomId)
                    if (!room) return null
                    const customRate = getSafeRate(roomId)
                    const rate = customRate ? parseFloat(customRate) : (Number(room.RoomType?.defaultPrice) || 0)
                    return (
                      <div key={roomId} className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Room {room.roomNumber} ({room.RoomType?.name})</span>
                        <span className="text-xs font-black text-slate-900">₹{rate.toLocaleString()}/night</span>
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 uppercase tracking-wider">Subtotal</span>
                    <span className="text-slate-900 font-black">₹{pricing.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 uppercase tracking-wider">Taxes</span>
                    <span className="text-slate-900 font-black">₹{pricing.taxVal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-emerald-600">
                    <span className="uppercase tracking-wider">Estimated Total</span>
                    <span className="font-black">₹{pricing.totalAmount.toLocaleString()}</span>
                  </div>
                  {parseFloat(advanceAmount) > 0 && (
                    <div className="flex justify-between text-xs font-bold text-indigo-600 border-t border-dashed border-slate-200 pt-2">
                      <span className="uppercase tracking-wider">Advance Paid ({advanceMethod})</span>
                      <span className="font-black">₹{parseFloat(advanceAmount).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Navigation Buttons (Sticky at Bottom) */}
      <div className="flex gap-4 pt-4 border-t border-slate-100 bg-white shrink-0 mt-2">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-slate-200"
            onClick={handlePrev}
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        )}
        {step < 6 ? (
          <Button
            type="button"
            className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest"
            disabled={!isStepValid()}
            onClick={handleNext}
          >
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            disabled={loading}
            className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20"
            onClick={handleSubmit}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            ) : (
              'Confirm & Book'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
