'use client'

/**
 * BookingDetailPage component handles the full-page management of a single reservation.
 * Supports room assignments, billing, services, payments, and invoice generation.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tables } from '@/database.types'
import { generateInvoicePDF } from '@/lib/finance/invoice-pdf'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/utils/supabase/client'
import { differenceInCalendarDays, format, isBefore } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  Calendar,
  CreditCard,
  Download,
  ExternalLink,
  Info,
  LogIn,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Trash2,
  User,
  XCircle
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type Booking = Tables<'Booking'> & {
  Guest: Tables<'Guest'> | null
  Payment:
  | Pick<Tables<'Payment'>, 'amount' | 'method' | 'status' | 'createdAt'>[]
  | null
}

type BookingRoom = Tables<'BookingRoom'> & {
  Room: Tables<'Room'> | null
  RoomType: Tables<'RoomType'> | null
}

type BookingService = Tables<'BookingService'> & {
  Service: Tables<'Service'> | null
}

type Room = Tables<'Room'> & {
  RoomType: Tables<'RoomType'> | null
}

type Service = Tables<'Service'>
type Property = Tables<'Property'> & {
  settings: {
    defaultTaxEnabled: boolean;
    taxAmount?: number;
    checkinTime: string;
    checkoutTime: string;
    gstin?: string;
    pan?: string;
    fssai?: string;
    [key: string]: any;
  } | null;
}
type Payment = Tables<'Payment'>
type PaymentStatus = Tables<'Payment'>['status']

export default function BookingDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PENDING')

  const [folio, setFolio] = useState<Booking | null>(null)
  const [assignments, setAssignments] = useState<BookingRoom[]>([])
  const [services, setServices] = useState<BookingService[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [availableServices, setAvailableServices] = useState<Service[]>([])
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [property, setProperty] = useState<Property | null>(null)
  const [showTax, setShowTax] = useState(true)
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const [gstin, setGstin] = useState('')
  const [grNumber, setGrNumber] = useState('')
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isAddRoomDialogOpen, setIsAddRoomDialogOpen] = useState(false)
  const [isSwitchRoomDialogOpen, setIsSwitchRoomDialogOpen] = useState(false)
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false)
  const [extendDays, setExtendDays] = useState(1)
  const [roomToSwitch, setRoomToSwitch] = useState<BookingRoom | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [roomCheckInDate, setRoomCheckInDate] = useState('')
  const [roomCheckOutDate, setRoomCheckOutDate] = useState('')
  const [switchDate, setSwitchDate] = useState('')

  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false)
  const [discountAmountInput, setDiscountAmountInput] = useState('0')
  const [discountTypeInput, setDiscountTypeInput] = useState<'FIXED' | 'PERCENTAGE'>('FIXED')
  const [activeBookings, setActiveBookings] = useState<any[]>([])

  const fetchFolioData = useCallback(async () => {
    if (!id) return
    setLoading(true)

    try {
      const [
        folioRes,
        assignmentsRes,
        servicesRes,
        payRes,
      ] = await Promise.all([
        supabase
          .from('Booking')
          .select('*, Guest(*), Payment(amount, method, status, createdAt)')
          .eq('id', id)
          .single(),
        supabase
          .from('BookingRoom')
          .select('*, Room(*), RoomType(*)')
          .eq('bookingId', id),
        supabase
          .from('BookingService')
          .select('*, Service(*)')
          .eq('bookingId', id),
        supabase
          .from('Payment')
          .select('*')
          .eq('bookingId', id)
          .order('createdAt', { ascending: true }),
      ])

      if (folioRes.data) {
        setFolio(folioRes.data)
        setGstin(folioRes.data.Guest?.gstin || '')
        setGrNumber((folioRes.data.Guest as any)?.grNumber || '')

        // Fetch property & related data once we have propertyId
        const [allServicesRes, allRoomsRes, propRes, activeBookingsRes] = await Promise.all([
          supabase
            .from('Service')
            .select('*')
            .eq('propertyId', folioRes.data.propertyId),
          supabase
            .from('Room')
            .select('*, RoomType(*)')
            .eq('RoomType.propertyId', folioRes.data.propertyId)
            .eq('status', 'AVAILABLE'),
          supabase
            .from('Property')
            .select('*')
            .eq('id', folioRes.data.propertyId)
            .single(),
          supabase
            .from('BookingRoom')
            .select('id, roomId, checkInDate, checkOutDate, Booking!inner(id, status, checkInDate, checkOutDate)')
            .neq('Booking.status', 'CANCELLED')
            .neq('Booking.status', 'CHECKED_OUT')
            .eq('Booking.propertyId', folioRes.data.propertyId),
        ])

        if (allServicesRes.data) setAvailableServices(allServicesRes.data)
        if (allRoomsRes.data) setAvailableRooms(allRoomsRes.data)
        if (activeBookingsRes.data) setActiveBookings(activeBookingsRes.data)
        if (propRes.data) {
          const propertyData = propRes.data as Property
          setProperty(propertyData)
          setShowTax(propertyData.settings?.defaultTaxEnabled !== false)
        }
      }

      if (assignmentsRes.data) setAssignments(assignmentsRes.data)
      if (servicesRes.data) setServices(servicesRes.data)
      if (payRes.data) setPayments(payRes.data)
    } catch (err) {
      console.error('Error fetching folio:', err)
    } finally {
      setLoading(false)
    }
  }, [id, supabase])

  const checkOverbookingOverlap = (roomId: string, startStr: string, endStr: string) => {
    if (!roomId || !startStr || !endStr || !property) return null

    const checkinTime = property.settings?.checkinTime || "08:00"
    const checkoutTime = property.settings?.checkoutTime || "07:00"
    let selStart = new Date(startStr + " " + checkinTime)
    let selEnd = new Date(endStr + " " + checkoutTime)
    if (property.timezone) {
      selStart = fromZonedTime(startStr, property.timezone)
      selEnd = fromZonedTime(endStr, property.timezone)
    }

    return activeBookings.find(stay => {
      if (stay.Booking?.id === id) return false
      if (stay.roomId !== roomId) return false

      const startVal = stay.checkInDate || stay.Booking?.checkInDate
      const endVal = stay.checkOutDate || stay.Booking?.checkOutDate
      if (!startVal || !endVal) return false

      const stayStart = new Date(startVal)
      const stayEnd = new Date(endVal)

      return stayStart < selEnd && stayEnd > selStart
    })
  }

  useEffect(() => {
    fetchFolioData()
  }, [fetchFolioData])

  const getRoomStayNights = useCallback((
    item: BookingRoom,
    f = folio,
    p = property
  ) => {
    if (!f || !p) return 1

    const bookingCheckInDate = new Date(f.checkInDate)
    const bookingCheckOutDate = new Date(f.checkOutDate)

    const checkOutTimeStr = format(bookingCheckOutDate, 'HH:mm:ss')
    const propCheckOutTime = p.settings?.checkoutTime
      ? `${p.settings.checkoutTime}:00`
      : (p.checkOutTime || '07:00:00')

    const itemCheckIn = item.checkInDate ? new Date(item.checkInDate) : bookingCheckInDate
    const itemCheckOut = item.checkOutDate ? new Date(item.checkOutDate) : bookingCheckOutDate

    let roomNights = differenceInCalendarDays(itemCheckOut, itemCheckIn)

    // Only apply late checkout extra charge/waiver if we fall back to booking dates
    if (!item.checkOutDate) {
      if (checkOutTimeStr > propCheckOutTime) {
        roomNights += 1
      }
      if (f.waiveLastDayCharge) {
        roomNights -= 1
      }
    }

    return Math.max(1, roomNights)
  }, [folio, property])

  const calculateCurrentTotal = (
    f = folio,
    a = assignments,
    s = services,
    p = property,
  ) => {
    if (!f || !p)
      return {
        total: 0,
        nights: 1,
        roomTotal: 0,
        serviceTotal: 0,
        discount: 0,
        tax: 0,
      }

    const bookingCheckInDate = new Date(f.checkInDate)
    const bookingCheckOutDate = new Date(f.checkOutDate)

    const checkOutTimeStr = format(bookingCheckOutDate, 'HH:mm:ss')
    const propCheckOutTime = p.settings?.checkoutTime
      ? `${p.settings.checkoutTime}:00`
      : (p.checkOutTime || '07:00:00')

    let defaultNights = differenceInCalendarDays(bookingCheckOutDate, bookingCheckInDate)
    if (checkOutTimeStr > propCheckOutTime) {
      defaultNights += 1
    }
    if (f.waiveLastDayCharge) {
      defaultNights -= 1
    }
    defaultNights = Math.max(1, defaultNights)

    const totalRoomCharges = a.reduce((sum, item) => {
      const roomNights = getRoomStayNights(item, f, p)
      const price = Number(item.priceOverride) || Number(item.RoomType?.defaultPrice) || 0
      return sum + (price * roomNights)
    }, 0)

    const serviceSubtotal = s.reduce(
      (sum, item) => sum + Number(item.totalPrice),
      0,
    )
    const subtotal = totalRoomCharges + serviceSubtotal
    const discountAmount =
      f.discountType === 'PERCENTAGE'
        ? subtotal * (Number(f.discountAmount) / 100)
        : Number(f.discountAmount || 0)

    const tax = showTax
      ? (subtotal - discountAmount) * ((p.settings?.taxAmount ?? p.taxPercentage ?? 0) / 100)
      : 0
    const finalTotal = subtotal - discountAmount + tax

    return {
      total: finalTotal,
      nights: defaultNights,
      roomTotal: totalRoomCharges,
      serviceTotal: serviceSubtotal,
      subtotal,
      discount: discountAmount,
      tax,
    }
  }

  const syncBookingTotal = async (updatedAssignments = assignments, updatedServices = services, updatedFolio = folio) => {
    if (!updatedFolio) return
    const { total: newTotal } = calculateCurrentTotal(updatedFolio, updatedAssignments, updatedServices)
    const { error } = await supabase
      .from('Booking')
      .update({ totalAmount: newTotal } as any)
      .eq('id', updatedFolio.id)
    if (!error) {
      setFolio({ ...updatedFolio, totalAmount: newTotal })
    }
  }

  const getExtendedCheckOutDateStr = () => {
    if (!folio) return ''
    const origCheckOut = new Date(folio.checkOutDate)
    const newCheckOut = new Date(origCheckOut)
    newCheckOut.setDate(newCheckOut.getDate() + (extendDays || 0))
    return format(newCheckOut, 'dd MMM yyyy')
  }

  const getExtendedEstimatedTotal = () => {
    if (!folio) return 0
    const origCheckOut = new Date(folio.checkOutDate)
    const newCheckOut = new Date(origCheckOut)
    newCheckOut.setDate(newCheckOut.getDate() + (extendDays || 0))
    const newCheckOutStr = newCheckOut.toISOString()
    const origCheckOutDateStr = format(origCheckOut, 'yyyy-MM-dd')
    const newCheckOutDateStr = format(newCheckOut, 'yyyy-MM-dd')

    const nextAssignments = assignments.map((a) => {
      if (!a.checkOutDate) return a
      const aCheckOutVal = format(new Date(a.checkOutDate), 'yyyy-MM-dd')
      if (aCheckOutVal === origCheckOutDateStr) {
        return { ...a, checkOutDate: newCheckOutDateStr }
      }
      return a
    })

    const updatedFolio = { ...folio, checkOutDate: newCheckOutStr }
    const { total } = calculateCurrentTotal(updatedFolio, nextAssignments, services)
    return total
  }

  const {
    total,
    nights: totalNights,
    roomTotal: totalRoomCharges,
    serviceTotal: serviceSubtotal,
    subtotal: bookingSubtotal,
    discount,
    tax: taxAmount,
  } = calculateCurrentTotal()

  const totalPaid = payments
    .filter((p) => ['PAID', 'PARTIAL'].includes(p.status || ''))
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const totalDue = Math.max(0, total - totalPaid)

  useEffect(() => {
    setPaymentStatus(totalDue > 0 ? 'PARTIAL' : 'PAID')
  }, [totalDue])

  const updateFolioField = async (field: string, value: any) => {
    if (!folio) return

    let processedValue = value

    if (
      (field === 'checkInDate' || field === 'checkOutDate') &&
      property?.timezone
    ) {
      processedValue = fromZonedTime(value, property.timezone).toISOString()
    }

    const updatedFolio = { ...folio, [field]: processedValue }
    const { total: newTotal } = calculateCurrentTotal(updatedFolio)

    const { error } = await supabase
      .from('Booking')
      .update({
        [field]: processedValue,
        totalAmount: newTotal,
      } as any)
      .eq('id', folio.id)

    if (!error) {
      setFolio({ ...updatedFolio, totalAmount: newTotal })
    }
  }

  const handleToggleWaiver = async () => {
    if (!folio) return
    const newWaiver = !folio.waiveLastDayCharge
    const updatedFolio = { ...folio, waiveLastDayCharge: newWaiver }
    const { total: newTotal } = calculateCurrentTotal(updatedFolio)

    setFolio(updatedFolio)
    await supabase
      .from('Booking')
      .update({ waiveLastDayCharge: newWaiver, totalAmount: newTotal } as any)
      .eq('id', folio.id)
  }

  const handleUpdateGstin = async (val: string) => {
    if (!folio?.guestId) return
    setGstin(val)
    await supabase
      .from('Guest')
      .update({ gstin: val } as any)
      .eq('id', folio.guestId)
  }

  const handleUpdateGrNumber = async (val: string) => {
    if (!folio?.guestId) return
    setGrNumber(val)
    await supabase
      .from('Guest')
      .update({ grNumber: val } as any)
      .eq('id', folio.guestId)
  }

  const handleCheckIn = async () => {
    if (!folio) return
    setLoading(true)
    await supabase
      .from('Booking')
      .update({ status: 'CHECKED_IN' } as any)
      .eq('id', folio.id)
    fetchFolioData()
  }

  const handleCheckOut = async () => {
    if (!folio) return
    setLoading(true)
    const now = new Date().toISOString()
    await supabase
      .from('Booking')
      .update({ status: 'CHECKED_OUT', actualCheckOut: now } as any)
      .eq('id', folio.id)

    // Mark rooms as dirty
    const roomIds = assignments.map(a => a.roomId).filter(Boolean) as string[]
    if (roomIds.length > 0) {
      await supabase
        .from('Room')
        .update({ status: 'DIRTY' })
        .in('id', roomIds)
    }

    fetchFolioData()
  }

  const handleUpdateDiscount = async () => {
    if (!folio) return
    const amt = parseFloat(discountAmountInput) || 0
    if (amt < 0) {
      alert("Discount amount cannot be negative")
      return
    }

    setLoading(true)
    const updatedFolio = { ...folio, discountAmount: amt, discountType: discountTypeInput }
    const { total: newTotal } = calculateCurrentTotal(updatedFolio, assignments, services)

    const { error } = await supabase
      .from('Booking')
      .update({
        discountAmount: amt,
        discountType: discountTypeInput,
        totalAmount: newTotal
      } as any)
      .eq('id', folio.id)

    if (error) {
      console.error("Error updating discount:", error)
      alert("Failed to update discount")
    } else {
      setFolio(updatedFolio)
      await syncBookingTotal(assignments, services, updatedFolio)
      setIsDiscountDialogOpen(false)
      fetchFolioData()
    }
    setLoading(false)
  }

  const handleCancelBooking = async () => {
    if (!folio) return
    if (!confirm('Are you sure you want to cancel this booking?')) return

    setLoading(true)
    await supabase
      .from('Booking')
      .update({ status: 'CANCELLED' } as any)
      .eq('id', folio.id)
    fetchFolioData()
  }

  const handleAddService = async (serviceId: string) => {
    const service = availableServices.find((s) => s.id === serviceId)
    if (!service || !folio) return

    const existing = services.find((s) => s.serviceId === serviceId)
    if (existing) {
      updateServiceQuantity(existing.id, (existing.quantity ?? 0) + 1)
      return
    }

    const { data, error } = await supabase
      .from('BookingService')
      .insert([{
        bookingId: folio.id,
        serviceId: service.id,
        quantity: 1,
        totalPrice: service.price,
      }])
      .select('*, Service(*)')
      .single()

    if (!error && data) {
      const nextServices = [...services, data]
      setServices(nextServices)
      await syncBookingTotal(assignments, nextServices)
    }
  }

  const updateServiceQuantity = async (id: string, newQty: number) => {
    if (newQty < 1) return
    const serviceItem = services.find((s) => s.id === id)
    if (!serviceItem) return

    const newTotal = Number(serviceItem.Service?.price || 0) * newQty
    const { error } = await supabase
      .from('BookingService')
      .update({ quantity: newQty, totalPrice: newTotal })
      .eq('id', id)

    if (!error) {
      const nextServices = services.map((s) => s.id === id ? { ...s, quantity: newQty, totalPrice: newTotal } : s)
      setServices(nextServices)
      await syncBookingTotal(assignments, nextServices)
    }
  }

  const handleExtendBooking = async (days: number) => {
    if (!folio || days <= 0) return

    const origCheckOut = new Date(folio.checkOutDate)
    const newCheckOut = new Date(origCheckOut)
    newCheckOut.setDate(newCheckOut.getDate() + days)
    const newCheckOutStr = newCheckOut.toISOString()
    const origCheckOutDateStr = format(origCheckOut, 'yyyy-MM-dd')
    const newCheckOutDateStr = format(newCheckOut, 'yyyy-MM-dd')

    // Find assignments that end on the original checkOutDate
    const assignmentsToUpdate = assignments.filter((a) => {
      if (!a.checkOutDate) return true // implicitly ends on checkout date
      const aCheckOutVal = format(new Date(a.checkOutDate), 'yyyy-MM-dd')
      return aCheckOutVal === origCheckOutDateStr
    })

    // Update non-null checkout dates in DB
    for (const a of assignmentsToUpdate) {
      if (a.checkOutDate) {
        const { error: updateRoomError } = await supabase
          .from('BookingRoom')
          .update({
            checkOutDate: newCheckOutDateStr,
          })
          .eq('id', a.id)
        if (updateRoomError) {
          console.error("Error updating assignment checkout date:", updateRoomError)
          alert("Failed to update some room assignments.")
          return
        }
      }
    }

    // Update assignments in local state
    const nextAssignments = assignments.map((a) => {
      if (!a.checkOutDate) return a
      const aCheckOutVal = format(new Date(a.checkOutDate), 'yyyy-MM-dd')
      if (aCheckOutVal === origCheckOutDateStr) {
        return { ...a, checkOutDate: newCheckOutDateStr }
      }
      return a
    })

    // Update booking in DB and sync booking total
    const updatedFolio = { ...folio, checkOutDate: newCheckOutStr }
    const { total: newTotal } = calculateCurrentTotal(updatedFolio, nextAssignments, services)

    const { error: updateBookingError } = await supabase
      .from('Booking')
      .update({
        checkOutDate: newCheckOutStr,
        totalAmount: newTotal,
      } as any)
      .eq('id', folio.id)

    if (updateBookingError) {
      console.error("Error updating booking checkout date:", updateBookingError)
      alert("Failed to extend booking check-out date.")
      return
    }

    setFolio({ ...updatedFolio, totalAmount: newTotal })
    setAssignments(nextAssignments)
  }

  const handleAddRoom = async (roomId: string, checkIn?: string, checkOut?: string) => {
    const room = availableRooms.find((r) => r.id === roomId)
    if (!room || !folio) return

    const { data, error } = await supabase
      .from('BookingRoom')
      .insert([{
        bookingId: folio.id,
        roomId: room.id,
        roomTypeId: room.roomTypeId,
        status: folio.status,
        checkInDate: checkIn || null,
        checkOutDate: checkOut || null,
      }])
      .select('*, Room(*), RoomType(*)')
      .single()

    if (!error && data) {
      const nextAssignments = [...assignments, data]
      setAssignments(nextAssignments)
      await syncBookingTotal(nextAssignments)
    }
  }

  const handleSwitchRoom = async (assignmentId: string, newRoomId: string, switchDateStr: string) => {
    const newRoom = availableRooms.find((r) => r.id === newRoomId)
    const activeAssignment = assignments.find((a) => a.id === assignmentId)
    if (!newRoom || !activeAssignment || !folio || !switchDateStr) return

    const bookingCheckInVal = format(new Date(folio.checkInDate), 'yyyy-MM-dd')
    const bookingCheckOutVal = format(new Date(folio.checkOutDate), 'yyyy-MM-dd')

    const assignCheckInVal = activeAssignment.checkInDate
      ? format(new Date(activeAssignment.checkInDate), 'yyyy-MM-dd')
      : bookingCheckInVal

    const assignCheckOutVal = activeAssignment.checkOutDate
      ? format(new Date(activeAssignment.checkOutDate), 'yyyy-MM-dd')
      : bookingCheckOutVal

    if (switchDateStr < assignCheckInVal || switchDateStr > assignCheckOutVal) {
      alert("Switch date must be within the room's stay period.")
      return
    }

    if (switchDateStr === assignCheckInVal) {
      // If switch date is the check-in date itself, update in-place
      const { error } = await supabase
        .from('BookingRoom')
        .update({
          roomId: newRoom.id,
          roomTypeId: newRoom.roomTypeId,
          priceOverride: null, // Reset price override on switch to use new room type default
        })
        .eq('id', assignmentId)

      if (!error) {
        // Mark old room as DIRTY
        if (activeAssignment.roomId) {
          await supabase
            .from('Room')
            .update({ status: 'DIRTY' })
            .eq('id', activeAssignment.roomId)
        }

        const nextAssignments = assignments.map(a =>
          a.id === assignmentId
            ? {
              ...a,
              roomId: newRoom.id,
              roomTypeId: newRoom.roomTypeId,
              priceOverride: null,
              Room: newRoom,
              RoomType: newRoom.RoomType
            }
            : a
        )
        setAssignments(nextAssignments)
        await syncBookingTotal(nextAssignments)
      }
    } else {
      // Split the assignment
      // 1. Update the old assignment's checkOutDate to the switchDate
      const { error: updateError } = await supabase
        .from('BookingRoom')
        .update({
          checkOutDate: switchDateStr,
        })
        .eq('id', assignmentId)

      if (updateError) {
        console.error("Error updating old room checkout date:", updateError)
        return
      }

      // Mark old room as DIRTY
      if (activeAssignment.roomId) {
        await supabase
          .from('Room')
          .update({ status: 'DIRTY' })
          .eq('id', activeAssignment.roomId)
      }

      // 2. Insert new assignment starting at switchDate
      const { data: newAssignment, error: insertError } = await supabase
        .from('BookingRoom')
        .insert([{
          bookingId: folio.id,
          roomId: newRoom.id,
          roomTypeId: newRoom.roomTypeId,
          status: folio.status,
          checkInDate: switchDateStr,
          checkOutDate: activeAssignment.checkOutDate || null,
          priceOverride: null,
        }])
        .select('*, Room(*), RoomType(*)')
        .single()

      if (insertError) {
        console.error("Error inserting new room stay:", insertError)
        return
      }

      // 3. Update local state and trigger sync
      const nextAssignments = assignments.map(a =>
        a.id === assignmentId
          ? { ...a, checkOutDate: switchDateStr }
          : a
      )
      const updatedAssignments = [...nextAssignments, newAssignment]
      setAssignments(updatedAssignments)
      await syncBookingTotal(updatedAssignments)
    }
  }

  const handleRollbackSwitch = async (assignmentId: string) => {
    const currAssignment = assignments.find((a) => a.id === assignmentId)
    if (!currAssignment || !folio) return

    const prevAssignment = assignments.find((a) => {
      if (a.id === currAssignment.id) return false
      if (!a.checkOutDate || !currAssignment.checkInDate) return false

      const prevCheckOutVal = format(new Date(a.checkOutDate), 'yyyy-MM-dd')
      const currCheckInVal = format(new Date(currAssignment.checkInDate), 'yyyy-MM-dd')
      return prevCheckOutVal === currCheckInVal
    })

    if (!prevAssignment) {
      alert("No matching previous room assignment found to roll back this switch.")
      return
    }

    if (!confirm(`Are you sure you want to rollback the switch to Room ${currAssignment.Room?.roomNumber} and revert the guest back to Room ${prevAssignment.Room?.roomNumber}?`)) {
      return
    }

    // 3. Update the previous assignment's checkOutDate to the current assignment's checkOutDate
    const { error: updateError } = await supabase
      .from('BookingRoom')
      .update({
        checkOutDate: currAssignment.checkOutDate,
      })
      .eq('id', prevAssignment.id)

    if (updateError) {
      console.error("Error updating previous room checkout date:", updateError)
      alert("Failed to update previous room reservation.")
      return
    }

    // 4. Delete the current assignment
    const { error: deleteError } = await supabase
      .from('BookingRoom')
      .delete()
      .eq('id', currAssignment.id)

    if (deleteError) {
      console.error("Error deleting switched room assignment:", deleteError)
      alert("Failed to delete the switched room assignment.")
      return
    }

    // 5. Update local state and sync
    const nextAssignments = assignments
      .map(a => a.id === prevAssignment.id ? { ...a, checkOutDate: currAssignment.checkOutDate } : a)
      .filter(a => a.id !== currAssignment.id)

    setAssignments(nextAssignments)
    await syncBookingTotal(nextAssignments)
  }

  const handleRemoveRoom = async (assignmentId: string) => {
    const { error } = await supabase
      .from('BookingRoom')
      .delete()
      .eq('id', assignmentId)
    if (!error) {
      const nextAssignments = assignments.filter((a) => a.id !== assignmentId)
      setAssignments(nextAssignments)
      await syncBookingTotal(nextAssignments)
    }
  }

  const handleRemoveService = async (serviceId: string) => {
    const { error } = await supabase
      .from('BookingService')
      .delete()
      .eq('id', serviceId)
    if (!error) {
      const nextServices = services.filter((s) => s.id !== serviceId)
      setServices(nextServices)
      await syncBookingTotal(assignments, nextServices)
    }
  }

  const handleUpdateRoomPrice = async (assignmentId: string, newPrice: number) => {
    const { error } = await supabase
      .from('BookingRoom')
      .update({ priceOverride: newPrice })
      .eq('id', assignmentId)

    if (!error) {
      const nextAssignments = assignments.map(a => a.id === assignmentId ? { ...a, priceOverride: newPrice } : a)
      setAssignments(nextAssignments)
      await syncBookingTotal(nextAssignments)
    }
  }

  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!folio) return
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const amount = Number(formData.get('amount'))
    const method = formData.get('method') as string
    const notes = formData.get('notes') as string
    const paymentDate = formData.get('paymentDate') as string

    const { data, error } = await supabase
      .from('Payment')
      .insert([{
        bookingId: folio.id,
        tenantId: folio.tenantId,
        amount,
        method,
        createdAt: paymentDate,
        status: totalDue <= amount ? 'PAID' : 'PARTIAL',
        notes: notes || null,
      }])
      .select('*')
      .single()

    if (!error && data) {
      setPayments([...payments, data])
      setIsPaymentDialogOpen(false)
    }
    setLoading(false)
  }

  const handleGenerateInvoice = async (mode: 'download' | 'print' = 'download') => {
    if (!folio || !property) return
    setIsGeneratingInvoice(true)
    try {
      const { total: finalTotal, tax: tAmount } = calculateCurrentTotal()
      await generateInvoicePDF(
        folio,
        assignments,
        services,
        property,
        payments,
        {
          nights: totalNights,
          roomTotal: totalRoomCharges,
          serviceTotal: serviceSubtotal,
          subtotal: bookingSubtotal ?? 0,
          discount,
          tax: tAmount,
          total: finalTotal,
          totalPaid,
          balance: Math.max(0, finalTotal - totalPaid),
          showTax,
        },
        mode,
      )
    } catch (err) {
      console.error('Invoice generation failed:', err)
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  if (loading) return <BookingDetailSkeleton />
  if (!folio) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Booking not found</div>

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full hover:bg-slate-100 h-12 w-12"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <title>{folio?.Guest?.name ? `${folio.Guest.name} | Reservation` : 'Reservation Details'}</title>
              <h1 className="text-4xl font-heading font-black tracking-tighter text-slate-900">
                {folio?.Guest?.name || 'Reservation Details'}
              </h1>
              <Badge className={cn(
                'font-black text-[10px] uppercase tracking-widest border-none px-4 py-1.5 rounded-full',
                folio.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600' :
                  folio.status === 'CHECKED_IN' ? 'bg-blue-50 text-blue-600' :
                    'bg-slate-100 text-slate-600'
              )}>
                {folio.status}
              </Badge>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
              Folio ID: {folio.id.slice(0, 8)} • Source: {folio.source}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="rounded-2xl h-14 px-6 font-black uppercase text-xs tracking-widest border-2 border-slate-100 hover:bg-slate-50"
            onClick={() => setIsInvoicePreviewOpen(true)}
          >
            <Receipt className="mr-2 h-4 w-4" />
            Preview Invoice
          </Button>

          {folio.status === 'CONFIRMED' ? (
            <Button
              className="rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20"
              onClick={handleCheckIn}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Check In Guest
            </Button>
          ) : (folio.status === 'CHECKED_IN' && totalDue > 0) ? (
            <Button
              className="rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest bg-blue-500 hover:bg-blue-600 shadow-xl shadow-blue-500/20"
              onClick={() => setIsPaymentDialogOpen(true)}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          ) : (folio.status === 'CHECKED_IN' && totalDue <= 0) ? (
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button
                  className="rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-500/20"
                />
              }>
                <LogOut className="mr-2 h-4 w-4" />
                Check Out
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Check Out</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to check out this booking? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCheckOut}>Confirm Check Out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              className="rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest bg-slate-900 hover:bg-slate-800"
              onClick={() => setIsInvoicePreviewOpen(true)}
            >
              <Receipt className="mr-2 h-4 w-4" />
              View Billing
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="rounded-2xl h-14 w-14 border-2 border-slate-100" />}>
              <MoreHorizontal className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-100 shadow-2xl">
              <DropdownMenuItem
                className="rounded-xl h-12 font-black uppercase text-[10px] tracking-widest gap-3"
                onClick={() => setIsPaymentDialogOpen(true)}
              >
                <CreditCard className="w-4 h-4 text-emerald-500" />
                Record Payment
              </DropdownMenuItem>
              {(folio?.status === 'CONFIRMED' || folio?.status === 'CHECKED_IN') && (
                <DropdownMenuItem
                  className="rounded-xl h-12 font-black uppercase text-[10px] tracking-widest gap-3"
                  onClick={() => {
                    setExtendDays(1)
                    setIsExtendDialogOpen(true)
                  }}
                >
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  Extend Booking
                </DropdownMenuItem>
              )}
              {/* <DropdownMenuItem 
                className="rounded-xl h-12 font-black uppercase text-[10px] tracking-widest gap-3"
                onClick={() => router.push(`/bookings/new?clone=${folio.id}`)}
              >
                <Plus className="w-4 h-4 text-primary" />
                Clone Booking
              </DropdownMenuItem> */}
              <div className="h-px bg-slate-50 my-2" />
              <DropdownMenuItem
                className="rounded-xl h-12 font-black uppercase text-[10px] tracking-widest gap-3 text-rose-500 focus:text-rose-600 focus:bg-rose-50"
                onClick={handleCancelBooking}
              >
                <XCircle className="w-4 h-4" />
                Cancel Booking
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Guest & Stay Info */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white">
            <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 relative">
              <div className="absolute -bottom-12 left-8">
                <div className="w-24 h-24 rounded-3xl bg-white border-4 border-white shadow-xl flex items-center justify-center">
                  <User className="h-12 w-12 text-primary" />
                </div>
              </div>
            </div>
            <CardContent className="pt-16 pb-8 px-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2
                    className="text-2xl font-heading font-black tracking-tighter text-slate-900 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => router.push(`/guests/${folio.guestId}`)}
                  >
                    {folio.Guest?.name}
                  </h2>
                  <p className="text-slate-400 font-bold text-sm">
                    {folio.Guest?.email || folio.Guest?.phone || 'No contact provided'}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push(`/guests/${folio.guestId}`)}>
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </Button>
              </div>

              <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adults</p>
                  <p className="text-lg font-black text-slate-900">{folio.adults}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Children</p>
                  <p className="text-lg font-black text-slate-900">{folio.children || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-50">
              <CardTitle className="text-lg font-black tracking-tighter flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Stay Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-8 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center z-10 border border-slate-100">
                  <ArrowLeft className="h-4 w-4 text-slate-300 rotate-180" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check In</p>
                  <p className="text-sm font-black text-slate-900">{format(new Date(folio.checkInDate), 'dd MMM yyyy')}</p>
                  <p className="text-[10px] font-bold text-slate-400">{format(new Date(folio.checkInDate), 'hh:mm a')}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check Out</p>
                  <p className="text-sm font-black text-slate-900">{format(new Date(folio.checkOutDate), 'dd MMM yyyy')}</p>
                  <p className="text-[10px] font-bold text-slate-400">{format(new Date(folio.checkOutDate), 'hh:mm a')}</p>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl flex items-center justify-between border border-primary/10">
                <span className="text-xs font-black text-primary uppercase tracking-widest">Duration</span>
                <span className="text-lg font-black text-primary">{totalNights} Nights</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-50">
              <CardTitle className="text-lg font-black tracking-tighter flex items-center gap-2">
                <Info className="h-5 w-5 text-slate-400" />
                Folio Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <textarea
                className="w-full bg-amber-50/50 border border-amber-100 p-4 rounded-2xl text-xs font-bold text-amber-900/60 leading-relaxed italic outline-none focus:border-amber-200 transition-colors"
                rows={4}
                value={folio.notes || ''}
                onChange={(e) => setFolio({ ...folio, notes: e.target.value })}
                onBlur={(e) => updateFolioField('notes', e.target.value)}
                placeholder="Special requests, flight details, etc."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Ledger & Management */}
        <div className="lg:col-span-2 space-y-8">
          <Tabs defaultValue="ledger" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1.5 rounded-[2rem] h-16">
              <TabsTrigger value="ledger" className="rounded-[1.5rem] font-black text-xs uppercase tracking-widest data-[state=active]:shadow-lg">
                Financial Ledger
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-[1.5rem] font-black text-xs uppercase tracking-widest data-[state=active]:shadow-lg">
                Reservation Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ledger" className="mt-8 space-y-8 animate-in slide-in-from-bottom-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Receipt className="w-3 h-3" /> Billing Items
                  </h4>
                  <SelectService
                    onAdd={handleAddService}
                    services={availableServices}
                    existingIds={[]}
                  />
                </div>

                <div className="space-y-3">
                  {assignments.map((a) => {
                    const roomNights = getRoomStayNights(a)
                    return (
                      <Card key={a.id} className="border-slate-100 shadow-sm rounded-[2rem] overflow-hidden">
                        <CardContent className="p-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                              <BedDouble className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-black text-slate-900">Room {a.Room?.roomNumber} Stay</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {roomNights} nights x ₹{(Number(a.priceOverride) || Number(a.RoomType?.defaultPrice) || 0).toLocaleString()}
                                {` (${format(new Date(a.checkInDate || folio?.checkInDate || ''), 'dd MMM')} - ${format(new Date(a.checkOutDate || folio?.checkOutDate || ''), 'dd MMM')})`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <PriceOverrideInput
                              initialValue={Number(a.priceOverride) || Number(a.RoomType?.defaultPrice) || 0}
                              onSave={(val) => handleUpdateRoomPrice(a.id, val)}
                            />
                            <div className="text-right min-w-[100px]">
                              <p className="font-black text-slate-900 text-lg">
                                ₹{((Number(a.priceOverride) || Number(a.RoomType?.defaultPrice) || 0) * roomNights).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {services.map((s) => (
                    <Card key={s.id} className="border-slate-100 shadow-sm rounded-[2rem] overflow-hidden group">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                            <Plus className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{s.Service?.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 bg-slate-100 rounded-lg"
                                onClick={() => updateServiceQuantity(s.id, (s.quantity ?? 0) - 1)}
                              >
                                -
                              </Button>
                              <span className="text-xs font-black w-6 text-center">{s.quantity}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 bg-slate-100 rounded-lg"
                                onClick={() => updateServiceQuantity(s.id, (s.quantity ?? 0) + 1)}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-black text-slate-900 text-lg">
                              ₹{Number(s.totalPrice).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 h-10 w-10 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            onClick={() => handleRemoveService(s.id)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Card className="border-none bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-900/30">
                <CardContent className="p-10 space-y-6">
                  <SummaryRow label="Stay Subtotal" value={totalRoomCharges} />
                  <SummaryRow label="Services & F&B" value={serviceSubtotal} />
                  <div className="flex justify-between items-center text-sm font-bold text-emerald-400">
                    <span className="flex items-center gap-2">
                      Discount Applied
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-all shrink-0"
                        onClick={() => {
                          setDiscountAmountInput(folio?.discountAmount?.toString() || '0')
                          setDiscountTypeInput((folio?.discountType as 'FIXED' | 'PERCENTAGE') || 'FIXED')
                          setIsDiscountDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                    <span className="font-black tracking-tight">- ₹{discount.toLocaleString()}</span>
                  </div>
                  <SummaryRow label="GST & Taxes" value={taxAmount} />

                  <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                    <div className="flex gap-6">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="waive-day"
                          checked={folio?.waiveLastDayCharge || false}
                          onChange={handleToggleWaiver}
                          className="w-5 h-5 rounded-md accent-primary bg-white/10 border-white/20"
                        />
                        <label htmlFor="waive-day" className="text-white/60 text-[10px] font-black uppercase tracking-widest cursor-pointer">Waive Day</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="show-tax"
                          checked={showTax}
                          onChange={(e) => setShowTax(e.target.checked)}
                          className="w-5 h-5 rounded-md accent-primary bg-white/10 border-white/20"
                        />
                        <label htmlFor="show-tax" className="text-white/60 text-[10px] font-black uppercase tracking-widest cursor-pointer">Inc. Tax</label>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Grand Total</p>
                      <h3 className="text-5xl font-heading font-black tracking-tighter text-white">₹{total.toLocaleString()}</h3>
                    </div>
                  </div>

                  <div className="pt-8 flex gap-4">
                    <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Total Paid</p>
                      <p className="text-xl font-black text-emerald-400">₹{totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Balance Due</p>
                      <p className="text-xl font-black text-rose-400">₹{totalDue.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {payments.length > 0 && (
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Payment Transaction History</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {payments.map((p) => (
                      <div key={p.id} className="flex justify-between items-center p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{p.method}</p>
                            <p className="text-[10px] font-bold text-slate-400">{format(new Date(p.createdAt ?? ''), 'dd MMM, hh:mm a')}</p>
                          </div>
                        </div>
                        {p.notes && <p className="text-xs text-slate-500">Note: {p.notes}</p>}
                        <p className="font-black text-emerald-600 text-lg">₹{Number(p.amount).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-8 space-y-8 animate-in slide-in-from-bottom-2">
              <Card className="rounded-[2.5rem] border-slate-100 shadow-sm bg-white overflow-hidden">
                <CardContent className="p-10 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Check-In Date/Time</Label>
                      <Input
                        type="datetime-local"
                        className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100"
                        value={format(toZonedTime(new Date(folio.checkInDate), property?.timezone || 'UTC'), "yyyy-MM-dd'T'HH:mm")}
                        onChange={(e) => updateFolioField('checkInDate', e.target.value)}
                      // disabled={folio.status !== 'CONFIRMED'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Check-Out Date/Time</Label>
                      <Input
                        type="datetime-local"
                        className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100"
                        value={format(toZonedTime(new Date(folio.checkOutDate), property?.timezone || 'UTC'), "yyyy-MM-dd'T'HH:mm")}
                        onChange={(e) => updateFolioField('checkOutDate', e.target.value)}
                      // disabled={folio.status === 'CHECKED_OUT'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Adults</Label>
                      <Input
                        type="number"
                        min="1"
                        className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100"
                        value={folio.adults || 1}
                        onChange={(e) => updateFolioField('adults', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Children</Label>
                      <Input
                        type="number"
                        min="0"
                        className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100"
                        value={folio.children || 0}
                        onChange={(e) => updateFolioField('children', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Guest GSTIN</Label>
                      <Input
                        className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100 uppercase"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        onBlur={(e) => handleUpdateGstin(e.target.value)}
                        placeholder="Optional GSTIN"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">GR Number</Label>
                      <Input
                        className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100 uppercase"
                        value={grNumber}
                        onChange={(e) => setGrNumber(e.target.value.toUpperCase())}
                        onBlur={(e) => handleUpdateGrNumber(e.target.value)}
                        placeholder="Internal GR #"
                      />
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-black text-slate-900">Room Assignments</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage linked rooms</p>
                    </div>
                    {(folio?.status === 'CONFIRMED' || folio?.status === 'CHECKED_IN') ? (
                      <Button
                        size="sm"
                        className="rounded-xl font-black uppercase text-[10px] tracking-widest bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20"
                        onClick={() => {
                          setSelectedRoomId('')
                          setRoomCheckInDate(folio ? format(new Date(folio.checkInDate), 'yyyy-MM-dd') : '')
                          setRoomCheckOutDate(folio ? format(new Date(folio.checkOutDate), 'yyyy-MM-dd') : '')
                          setIsAddRoomDialogOpen(true)
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Room
                      </Button>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Read Only</span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {assignments.map((a) => {
                      const prevSwitch = assignments.find((prev) => {
                        if (prev.id === a.id) return false
                        if (!prev.checkOutDate || !a.checkInDate) return false
                        const prevCheckOutVal = format(new Date(prev.checkOutDate), 'yyyy-MM-dd')
                        const aCheckInVal = format(new Date(a.checkInDate), 'yyyy-MM-dd')
                        return prevCheckOutVal === aCheckInVal
                      })

                      return (
                        <div key={a.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-primary">
                              {a.Room?.roomNumber}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-slate-700">{a.RoomType?.name}</span>
                              <span className="text-[10px] font-bold text-slate-400">
                                Timeline: {format(new Date(a.checkInDate || folio?.checkInDate || ''), 'dd MMM yyyy')} - {format(new Date(a.checkOutDate || folio?.checkOutDate || ''), 'dd MMM yyyy')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {prevSwitch && (folio?.status === 'CONFIRMED' || folio?.status === 'CHECKED_IN') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-xl font-black uppercase text-[10px] tracking-widest text-amber-600 hover:bg-amber-50"
                                onClick={() => handleRollbackSwitch(a.id)}
                              >
                                Rollback Switch
                              </Button>
                            )}
                            {(folio?.status === 'CONFIRMED' || folio?.status === 'CHECKED_IN') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-xl font-black uppercase text-[10px] tracking-widest text-indigo-600 hover:bg-indigo-50"
                                onClick={() => {
                                  setRoomToSwitch(a)
                                  setSelectedRoomId('')
                                  const todayStr = format(new Date(), 'yyyy-MM-dd')
                                  const checkInVal = a.checkInDate ? format(new Date(a.checkInDate), 'yyyy-MM-dd') : (folio ? format(new Date(folio.checkInDate), 'yyyy-MM-dd') : todayStr)
                                  const checkOutVal = a.checkOutDate ? format(new Date(a.checkOutDate), 'yyyy-MM-dd') : (folio ? format(new Date(folio.checkOutDate), 'yyyy-MM-dd') : todayStr)
                                  if (todayStr >= checkInVal && todayStr <= checkOutVal) {
                                    setSwitchDate(todayStr)
                                  } else {
                                    setSwitchDate(checkInVal)
                                  }
                                  setIsSwitchRoomDialogOpen(true)
                                }}
                              >
                                Switch Room
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={() => handleRemoveRoom(a.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Invoice Preview Dialog */}
      <Dialog open={isInvoicePreviewOpen} onOpenChange={setIsInvoicePreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-0 border-none shadow-3xl">
          <div className="p-10 space-y-8 bg-white">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-4xl font-heading font-black tracking-tighter text-slate-900 leading-none">Invoice Preview</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Professional Billing Document</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => handleGenerateInvoice('print')} disabled={isGeneratingInvoice} className="rounded-2xl h-12 px-6 border-slate-200 font-black uppercase text-[10px] tracking-widest">
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
                <Button onClick={() => handleGenerateInvoice('download')} disabled={isGeneratingInvoice} className="rounded-2xl h-12 px-6 bg-slate-900 font-black uppercase text-[10px] tracking-widest">
                  <Download className="w-4 h-4 mr-2" /> PDF
                </Button>
              </div>
            </div>

            <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
              <div className="grid grid-cols-2 gap-8 pb-6 border-b border-slate-200">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Guest Details</p>
                  <p className="font-black text-slate-900 text-lg">{folio.Guest?.name}</p>
                  {gstin && <p className="text-[10px] font-bold text-primary mt-1">GSTIN: {gstin}</p>}
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Stay Period</p>
                  <p className="font-bold text-slate-600 text-sm">
                    {format(new Date(folio.checkInDate), 'dd MMM')} - {format(new Date(folio.checkOutDate), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500 uppercase tracking-wider">Accommodation ({totalNights} nights)</span>
                  <span className="text-slate-900 font-black">₹{totalRoomCharges.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500 uppercase tracking-wider">Services & Add-ons</span>
                  <span className="text-slate-900 font-black">₹{serviceSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-emerald-600">
                  <span className="uppercase tracking-wider">Discounts</span>
                  <span className="font-black">- ₹{discount.toLocaleString()}</span>
                </div>
                {showTax && <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500 uppercase tracking-wider">Taxes ({property?.settings?.taxAmount ?? property?.taxPercentage}%)</span>
                  <span className="text-slate-900 font-black">₹{taxAmount.toLocaleString()}</span>
                </div>}
                {totalPaid > 0 && <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500 uppercase tracking-wider">Paid</span>
                  <span className="text-slate-900 font-black">₹{totalPaid.toLocaleString()}</span>
                </div>}
                <div className="pt-6 mt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-black uppercase tracking-widest text-slate-400">Total Due</span>
                  <span className="text-3xl font-heading font-black text-primary">₹{(total - totalPaid).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-[10px] font-bold text-amber-800 leading-tight italic">
                Final invoice will include legal headers, property address, and transaction timestamps.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading font-black tracking-tighter">Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Outstanding</span>
                <span className="text-2xl font-heading font-black text-slate-900">₹{totalDue.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Amount</Label>
                <Input name="amount" type="number" step="0.01" required defaultValue={totalDue} className="h-12 rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Notes</Label>
                <Input name="notes" type="text" className="h-10 rounded-xl font-bold" placeholder="Add notes..." />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Method</Label>
                <Select name="method" required defaultValue="CASH">
                  <SelectTrigger className="h-12 rounded-xl font-bold">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash Payment</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                    <SelectItem value="UPI">UPI / Digital Wallet</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Date</Label>
                <Input
                  name="paymentDate"
                  type="datetime-local"
                  className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100"
                  defaultValue={format(toZonedTime(isBefore(folio.checkOutDate, new Date()) ? new Date(folio.checkInDate) : new Date(), property?.timezone || 'UTC'), "yyyy-MM-dd'T'HH:mm")}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-slate-900 shadow-xl shadow-slate-900/20">
              {loading ? 'PROCESSING...' : 'CONFIRM TRANSACTION'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Room Dialog */}
      <Dialog open={isAddRoomDialogOpen} onOpenChange={setIsAddRoomDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[3rem] p-0 border-none shadow-3xl">
          <div className="p-8 space-y-6 bg-white rounded-[3rem]">
            <div>
              <h3 className="text-2xl font-heading font-black tracking-tighter text-slate-900 leading-none">Add Room</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Add a room with timeline override</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Room</Label>
                <SearchableCombobox
                  options={
                    availableRooms
                      .filter((r) => r.status === 'AVAILABLE' && !assignments.some((a) => a.roomId === r.id))
                      .map((r) => ({
                        value: r.id,
                        label: `${r.roomNumber} (${r.RoomType?.name} - ₹${r.RoomType?.defaultPrice}/night)`,
                      }))
                  }
                  value={selectedRoomId}
                  onChange={(val) => setSelectedRoomId(val || '')}
                  placeholder="Search Room..."
                />
              </div>

              {selectedRoomId && (() => {
                const overlap = checkOverbookingOverlap(
                  selectedRoomId,
                  roomCheckInDate,
                  roomCheckOutDate || (folio ? format(new Date(folio.checkOutDate), 'yyyy-MM-dd') : '')
                )
                if (overlap) {
                  return (
                    <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2.5 mt-1 select-none">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <p className="text-[10px] font-bold leading-normal uppercase tracking-tight">
                        Warning: Room is already booked during this period
                      </p>
                    </div>
                  )
                }
                return null
              })()}

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Check-In Date</Label>
                <Input
                  type="date"
                  className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100"
                  value={roomCheckInDate}
                  onChange={(e) => setRoomCheckInDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Check-Out Date (Optional)</Label>
                <Input
                  type="date"
                  className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100"
                  value={roomCheckOutDate}
                  onChange={(e) => setRoomCheckOutDate(e.target.value)}
                  placeholder="Keep empty to match overall booking"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                className="rounded-2xl h-12 px-6 border-slate-200 font-black uppercase text-[10px] tracking-widest"
                onClick={() => setIsAddRoomDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="rounded-2xl h-12 px-6 bg-slate-900 hover:bg-slate-800 font-black uppercase text-[10px] tracking-widest"
                disabled={!selectedRoomId || !roomCheckInDate}
                onClick={async () => {
                  await handleAddRoom(selectedRoomId, roomCheckInDate, roomCheckOutDate || undefined)
                  setIsAddRoomDialogOpen(false)
                }}
              >
                Confirm Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Switch Room Dialog */}
      <Dialog open={isSwitchRoomDialogOpen} onOpenChange={setIsSwitchRoomDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[3rem] p-0 border-none shadow-3xl">
          <div className="p-8 space-y-6 bg-white rounded-[3rem]">
            <div>
              <h3 className="text-2xl font-heading font-black tracking-tighter text-slate-900 leading-none">Switch Room</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Move guest to a different available room</p>
            </div>

            {roomToSwitch && (
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Current Assignment</p>
                <p className="font-black text-slate-900 text-sm">Room {roomToSwitch.Room?.roomNumber} ({roomToSwitch.RoomType?.name})</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select New Room</Label>
              <SearchableCombobox
                options={
                  availableRooms
                    .filter((r) => r.status === 'AVAILABLE' && !assignments.some((a) => a.roomId === r.id))
                    .map((r) => ({ value: r.id, label: `Room ${r.roomNumber} (${r.RoomType?.name})  - ₹${r.RoomType?.defaultPrice}/night` }))
                }
                onChange={(val) => setSelectedRoomId(val || '')}
                placeholder="Search new room"
                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
              />
            </div>

            {selectedRoomId && roomToSwitch && (() => {
              const switchCheckInStr = switchDate
              const switchCheckOutStr = roomToSwitch.checkOutDate
                ? format(new Date(roomToSwitch.checkOutDate), 'yyyy-MM-dd')
                : (folio ? format(new Date(folio.checkOutDate), 'yyyy-MM-dd') : '')

              const overlap = checkOverbookingOverlap(selectedRoomId, switchCheckInStr, switchCheckOutStr)
              if (overlap) {
                return (
                  <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2.5 mt-1 select-none">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p className="text-[10px] font-bold leading-normal uppercase tracking-tight">
                      Warning: Room is already booked during this period
                    </p>
                  </div>
                )
              }
              return null
            })()}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Switch Date</Label>
              <Input
                type="date"
                className="h-14 rounded-2xl font-bold bg-slate-50 border-slate-100"
                value={switchDate}
                onChange={(e) => setSwitchDate(e.target.value)}
                min={roomToSwitch && folio ? (roomToSwitch.checkInDate ? format(new Date(roomToSwitch.checkInDate), 'yyyy-MM-dd') : format(new Date(folio.checkInDate), 'yyyy-MM-dd')) : undefined}
                max={roomToSwitch && folio ? (roomToSwitch.checkOutDate ? format(new Date(roomToSwitch.checkOutDate), 'yyyy-MM-dd') : format(new Date(folio.checkOutDate), 'yyyy-MM-dd')) : undefined}
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                className="rounded-2xl h-12 px-6 border-slate-200 font-black uppercase text-[10px] tracking-widest"
                onClick={() => setIsSwitchRoomDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="rounded-2xl h-12 px-6 bg-indigo-600 hover:bg-indigo-700 font-black uppercase text-[10px] tracking-widest text-white shadow-lg shadow-indigo-500/20"
                disabled={!selectedRoomId || !roomToSwitch || !switchDate}
                onClick={async () => {
                  if (roomToSwitch) {
                    await handleSwitchRoom(roomToSwitch.id, selectedRoomId, switchDate)
                  }
                  setIsSwitchRoomDialogOpen(false)
                }}
              >
                Confirm Switch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend Booking Dialog */}
      <Dialog open={isExtendDialogOpen} onOpenChange={setIsExtendDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[3rem] p-0 border-none shadow-3xl">
          <div className="p-8 space-y-6 bg-white rounded-[3rem]">
            <div>
              <h3 className="text-2xl font-heading font-black tracking-tighter text-slate-900 leading-none">Extend Booking</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Extend the reservation check-out date</p>
            </div>

            {folio && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Current Check-out</span>
                  <span className="font-black text-slate-700">{format(new Date(folio.checkOutDate), 'dd MMM yyyy')}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">New Check-out</span>
                  <span className="font-black text-indigo-600">{getExtendedCheckOutDateStr()}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Number of Days to Extend</Label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  type="button"
                  className="w-12 h-12 rounded-xl font-black text-lg border-slate-200"
                  onClick={() => setExtendDays(Math.max(1, extendDays - 1))}
                >
                  -
                </Button>
                <Input
                  type="number"
                  min="1"
                  className="h-12 text-center rounded-xl font-black text-lg bg-slate-50 border-slate-100 flex-1"
                  value={extendDays}
                  onChange={(e) => setExtendDays(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <Button
                  variant="outline"
                  type="button"
                  className="w-12 h-12 rounded-xl font-black text-lg border-slate-200"
                  onClick={() => setExtendDays(extendDays + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            {folio && (
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex justify-between items-center">
                <span className="font-black text-slate-700 text-xs uppercase tracking-wider text-[9px]">Estimated New Total</span>
                <span className="font-black text-indigo-600 text-lg">₹{getExtendedEstimatedTotal().toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                className="rounded-2xl h-12 px-6 border-slate-200 font-black uppercase text-[10px] tracking-widest"
                onClick={() => setIsExtendDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="rounded-2xl h-12 px-6 bg-indigo-600 hover:bg-indigo-700 font-black uppercase text-[10px] tracking-widest text-white shadow-lg shadow-indigo-500/20"
                onClick={async () => {
                  await handleExtendBooking(extendDays)
                  setIsExtendDialogOpen(false)
                }}
              >
                Confirm Extension
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discount Update Dialog */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="rounded-3xl border-slate-100 max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-slate-800 text-lg uppercase tracking-tight">Add / Update Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Discount Type</Label>
              <Select
                value={discountTypeInput}
                onValueChange={(val: any) => setDiscountTypeInput(val || 'FIXED')}
              >
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                  <SelectItem value="FIXED" className="rounded-lg font-bold">Fixed Amount (₹)</SelectItem>
                  <SelectItem value="PERCENTAGE" className="rounded-lg font-bold">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Discount Value</Label>
              <Input
                type="number"
                min="0"
                className="h-12 rounded-xl font-bold bg-slate-50 border-slate-100"
                value={discountAmountInput}
                onChange={(e) => setDiscountAmountInput(e.target.value)}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest border-slate-200"
                onClick={() => setIsDiscountDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={loading}
                className="flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 text-white"
                onClick={handleUpdateDiscount}
              >
                Apply Discount
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryRow({ label, value, className = '' }: { label: string, value: number, className?: string }) {
  return (
    <div className={cn('flex justify-between items-center text-sm font-bold text-white/70', className)}>
      <span>{label}</span>
      <span className="font-black tracking-tight">{value < 0 ? `- ₹${Math.abs(value).toLocaleString()}` : `₹${value.toLocaleString()}`}</span>
    </div>
  )
}

function PriceOverrideInput({
  initialValue,
  onSave,
}: {
  initialValue: number
  onSave: (val: number) => void
}) {
  const [val, setVal] = useState(initialValue)
  const [isEditing, setIsEditing] = useState(false)

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:border-primary cursor-pointer transition-all"
      >
        <span className="text-slate-400 font-bold text-xs">₹</span>
        <span className="font-black text-sm text-slate-900">
          {val.toLocaleString()}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-primary shadow-sm">
      <span className="text-slate-400 font-bold text-xs">₹</span>
      <input
        autoFocus
        type="number"
        value={val}
        onChange={(e) => setVal(Number(e.target.value))}
        onBlur={() => {
          setIsEditing(false)
          onSave(val)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setIsEditing(false)
            onSave(val)
          }
        }}
        className="bg-transparent border-none outline-none font-black text-sm w-20 text-slate-900"
      />
    </div>
  )
}

function SelectService({ onAdd, services, existingIds }: { onAdd: (id: string) => void, services: Service[], existingIds: string[] }) {
  const options = services
    .filter((s) => !existingIds.includes(s.id))
    .map((s) => ({ value: s.id, label: `${s.name} - ₹${s.price}` }))

  return (
    <div className="w-[200px]">
      <SearchableCombobox
        options={options}
        onChange={onAdd}
        placeholder="Add Charge..."
        className="text-[9px] font-black uppercase tracking-widest bg-slate-50 border-slate-100 rounded-xl"
      />
    </div>
  )
}

function SelectRoom({ onAdd, rooms, existingIds }: { onAdd: (id: string) => void, rooms: Room[], existingIds: string[] }) {
  const options = rooms
    .filter((r) => r.status === 'AVAILABLE' && !existingIds.includes(r.id))
    .map((r) => ({
      value: r.id,
      label: `Room ${r.roomNumber} (${r.RoomType?.name})`,
    }))

  return (
    <div className="w-[200px]">
      <SearchableCombobox
        options={options}
        onChange={onAdd}
        placeholder="Add Room..."
        className="text-[9px] font-black uppercase tracking-widest bg-slate-50 border-slate-100 rounded-xl"
      />
    </div>
  )
}

function BookingDetailSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-4 w-40 rounded-lg" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-14 w-40 rounded-2xl" />
          <Skeleton className="h-14 w-40 rounded-2xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Skeleton className="h-[400px] rounded-[2.5rem]" />
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-16 w-full rounded-[2rem]" />
          <Skeleton className="h-[500px] w-full rounded-[2.5rem]" />
        </div>
      </div>
    </div>
  )
}
