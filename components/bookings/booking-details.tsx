'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { generateInvoicePDF } from '@/lib/finance/invoice-pdf'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/utils/supabase/client'
import { differenceInCalendarDays, format } from 'date-fns'
import {
  AlertCircle,
  BedDouble,
  Calendar,
  CreditCard,
  Download,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  MoreHorizontal,
  Plus,
  Printer,
  Receipt,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface BookingDetailsProps {
  booking: Tables<'Booking'> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh?: () => void
}

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
type Property = Tables<'Property'>
type Payment = Tables<'Payment'>
type PaymentStatus = Tables<'Payment'>['status']

export function BookingDetails({
  booking: leadBooking,
  open,
  onOpenChange,
  onRefresh,
}: BookingDetailsProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
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

  const fetchFolioData = async () => {
    if (!leadBooking?.id) return
    setLoading(true)

    try {
      const [
        folioRes,
        assignmentsRes,
        servicesRes,
        allServicesRes,
        allRoomsRes,
        propRes,
        payRes,
      ] = await Promise.all([
        supabase
          .from('Booking')
          .select('*, Guest(*), Payment(amount, method, status, createdAt)')
          .eq('id', leadBooking.id)
          .order('createdAt', { referencedTable: 'Payment', ascending: false })
          .single(),
        supabase
          .from('BookingRoom')
          .select('*, Room(*), RoomType(*)')
          .eq('bookingId', leadBooking.id),
        supabase
          .from('BookingService')
          .select('*, Service(*)')
          .eq('bookingId', leadBooking.id),
        supabase
          .from('Service')
          .select('*')
          .eq('propertyId', leadBooking.propertyId),
        supabase
          .from('Room')
          .select('*, RoomType(*)')
          .eq('RoomType.propertyId', leadBooking.propertyId)
          .eq('status', 'AVAILABLE'),
        supabase
          .from('Property')
          .select('*')
          .eq('id', leadBooking.propertyId)
          .single(),
        supabase
          .from('Payment')
          .select('*')
          .eq('bookingId', leadBooking.id)
          .order('createdAt', { ascending: true }),
      ])

      if (folioRes.data) {
        setFolio(folioRes.data)
        setGstin(folioRes.data.Guest?.gstin || '')
        setGrNumber((folioRes.data.Guest as any)?.grNumber || '')
      }
      if (assignmentsRes.data) setAssignments(assignmentsRes.data)
      if (servicesRes.data) setServices(servicesRes.data)
      if (allServicesRes.data) setAvailableServices(allServicesRes.data)
      if (allRoomsRes.data) setAvailableRooms(allRoomsRes.data)
      if (propRes.data) setProperty(propRes.data)
      if (payRes.data) setPayments(payRes.data)
    } catch (err) {
      console.error('Error fetching folio:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleWaiver = async () => {
    if (!folio || !leadBooking) return
    const newWaiver = !folio.waiveLastDayCharge
    setFolio((prev) =>
      prev ? { ...prev, waiveLastDayCharge: newWaiver } : null,
    )

    const { error } = await supabase
      .from('Booking')
      .update({ waiveLastDayCharge: newWaiver })
      .eq('id', leadBooking.id)

    if (error) {
      console.error('Error updating waiver:', error)
      setFolio((prev) =>
        prev ? { ...prev, waiveLastDayCharge: !newWaiver } : null,
      )
    }
  }

  const handleUpdateGstin = async (val: string) => {
    if (!folio?.guestId) return
    setGstin(val)
    const { error } = await supabase
      .from('Guest')
      .update({ gstin: val } as any)
      .eq('id', folio.guestId)

    if (!error && onRefresh) onRefresh()
  }

  const handleUpdateGrNumber = async (val: string) => {
    if (!folio?.guestId) return
    setGrNumber(val)
    const { error } = await supabase
      .from('Guest')
      .update({ grNumber: val } as any)
      .eq('id', folio.guestId)
    if (!error && onRefresh) onRefresh()
  }

  const handleCheckOut = async () => {
    if (!folio) return
    setLoading(true)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('Booking')
      .update({
        status: 'CHECKED_OUT',
        actualCheckOut: now,
      } as any)
      .eq('id', folio.id)

    if (!error) {
      if (onRefresh) onRefresh()
    }
    onOpenChange(false)
    setLoading(false)
  }

  const handleCheckIn = async () => {
    if (!folio) return
    setLoading(true)
    const { error } = await supabase
      .from('Booking')
      .update({
        status: 'CHECKED_IN',
      } as any)
      .eq('id', folio.id)

    if (!error) {
      if (onRefresh) onRefresh()
    }
    setLoading(false)
  }

  const handleGenerateInvoice = async (
    mode: 'download' | 'print' = 'download',
  ) => {
    if (!folio || !property) return
    setIsGeneratingInvoice(true)
    try {
      const { total: finalTotal, tax: taxAmount } = calculateCurrentTotal()

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
          tax: taxAmount,
          total,
          totalPaid,
          balance: totalDue,
          showTax,
        },
        mode,
      )

      await supabase.from('Billing').upsert({
        bookingId: folio.id,
        tenantId: folio.tenantId,
        totalAmount: finalTotal,
        taxAmount: taxAmount,
        paymentStatus: paymentStatus,
        currency: 'INR',
      })

      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Invoice generation failed:', err)
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  useEffect(() => {
    if (open && leadBooking?.id) fetchFolioData()
  }, [open, leadBooking?.id])

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

    const checkInDate = new Date(f.checkInDate)
    const checkOutDate = new Date(f.checkOutDate)

    // 1. Base nights = calendar days difference
    let nights = differenceInCalendarDays(checkOutDate, checkInDate)

    // 2. If checkout time is after property's checkout time, add 1 night
    const checkOutTimeStr = format(checkOutDate, 'HH:mm:ss')
    const propCheckOutTime = p.checkOutTime || '07:00:00'

    if (checkOutTimeStr > propCheckOutTime) {
      nights += 1
    }

    // 3. Apply waiver if enabled
    if (f.waiveLastDayCharge) {
      nights -= 1
    }

    nights = Math.max(1, nights)

    const roomSubtotal = a.reduce(
      (sum, item) =>
        sum +
        (Number(item.priceOverride) ||
          Number(item.RoomType?.defaultPrice) ||
          0),
      0,
    )
    const totalRoomCharges = roomSubtotal * nights
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
      ? (subtotal - discountAmount) * ((p.taxPercentage || 0) / 100)
      : 0
    const finalTotal = subtotal - discountAmount + tax

    return {
      total: finalTotal,
      nights,
      roomTotal: totalRoomCharges,
      serviceTotal: serviceSubtotal,
      subtotal,
      discount: discountAmount,
      tax,
    }
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      if (onRefresh) onRefresh()
    }
  }

  const handleUpdateAssignment = async (
    id: string,
    updates: Partial<BookingRoom>,
  ) => {
    const { error } = await supabase
      .from('BookingRoom')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updates as any)
      .eq('id', id)
    if (!error) {
      setAssignments(
        assignments.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      )
    }
  }

  const handleAddService = async (serviceId: string) => {
    const service = availableServices.find((s) => s.id === serviceId)
    if (!service || !folio) return

    // Check if service already exists in ledger
    const existing = services.find((s) => s.serviceId === serviceId)
    if (existing) {
      updateServiceQuantity(existing.id, existing.quantity ?? 0 + 1)
      return
    }

    const { data, error } = await supabase
      .from('BookingService')
      .insert([
        {
          bookingId: folio.id,
          serviceId: service.id,
          quantity: 1,
          totalPrice: service.price,
        },
      ])
      .select('*, Service(*)')
      .single()

    if (!error && data) setServices([...services, data])
  }

  const updateServiceQuantity = async (id: string, newQty: number) => {
    if (newQty < 1) return
    const serviceItem = services.find((s) => s.id === id)
    if (!serviceItem) return

    const newTotal = Number(serviceItem.Service?.price || 0) * newQty
    const { error } = await supabase
      .from('BookingService')
      .update({
        quantity: newQty,
        totalPrice: newTotal,
      })
      .eq('id', id)

    if (!error) {
      setServices(
        services.map((s) =>
          s.id === id ? { ...s, quantity: newQty, totalPrice: newTotal } : s,
        ),
      )
    }
  }

  const handleAddRoom = async (roomId: string) => {
    const room = availableRooms.find((r) => r.id === roomId)
    if (!room || !folio) return

    const { data, error } = await supabase
      .from('BookingRoom')
      .insert([
        {
          bookingId: folio.id,
          roomId: room.id,
          roomTypeId: room.roomTypeId,
          status: 'CONFIRMED',
        },
      ])
      .select('*, Room(*), RoomType(*)')
      .single()

    if (!error && data) setAssignments([...assignments, data])
  }

  const handleRemoveRoom = async (assignmentId: string) => {
    const { error } = await supabase
      .from('BookingRoom')
      .delete()
      .eq('id', assignmentId)
    if (!error) {
      setAssignments(assignments.filter((a) => a.id !== assignmentId))
    }
  }

  const handleRemoveService = async (serviceId: string) => {
    const { error } = await supabase
      .from('BookingService')
      .delete()
      .eq('id', serviceId)
    if (!error) {
      setServices(services.filter((s) => s.id !== serviceId))
    }
  }

  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!folio) return
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const amount = Number(formData.get('amount'))
    const method = formData.get('method') as string

    const { data, error } = await supabase
      .from('Payment')
      .insert([
        {
          bookingId: folio.id,
          tenantId: folio.tenantId,
          amount,
          method,
          status: totalDue === amount ? 'PAID' : 'PARTIAL',
        },
      ])
      .select('*')
      .single()

    if (!error && data) {
      const updatedPayments = [...payments, data]
      setPayments(updatedPayments)

      const newTotalPaid = updatedPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      )
      if (newTotalPaid >= total) {
        setPaymentStatus('PAID')
      } else {
        setPaymentStatus('PARTIAL')
      }
      setIsPaymentDialogOpen(false)
      if (onRefresh) onRefresh()
    }
    setLoading(false)
  }

  if (!folio) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl bg-white border-l p-0 flex flex-col h-full shadow-2xl overflow-hidden">
        <Tabs
          defaultValue="details"
          className="flex flex-col h-full w-full"
          onValueChange={setActiveTab}
        >
          {/* Header Section */}
          <div className="bg-slate-50 p-8 border-b border-slate-100 shrink-0">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <Badge
                  className={cn(
                    'font-black text-[9px] uppercase tracking-widest border-none px-3 py-1',
                    folio.status === 'CONFIRMED'
                      ? 'bg-emerald-50 text-emerald-600'
                      : folio.status === 'CHECKED_IN'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-primary/5 text-primary',
                  )}
                >
                  {folio.status}
                </Badge>
                <h2 className="text-4xl font-heading font-black tracking-tighter text-slate-900 leading-none">
                  {folio.Guest?.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Folio ID: {folio.id.slice(0, 8)} • {folio.source}
                  </p>
                  <Badge
                    variant="outline"
                    className="text-[8px] font-black uppercase px-2 h-4 border-slate-200"
                  >
                    {paymentStatus ?? 'UNPAID'}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Total
                </p>
                <p className="text-3xl font-heading font-black tracking-tighter text-primary">
                  ₹{total.toLocaleString()}
                </p>
              </div>
            </div>

            <TabsList className="grid w-full grid-cols-2 bg-slate-200/50 p-1 rounded-xl h-12">
              <TabsTrigger
                value="details"
                className="rounded-lg font-black text-[10px] uppercase tracking-widest"
              >
                Reservation Details
              </TabsTrigger>
              <TabsTrigger
                value="folio"
                className="rounded-lg font-black text-[10px] uppercase tracking-widest"
              >
                Folio Ledger
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Scrollable Content Section */}
          <div className="flex-1 overflow-y-auto p-8 scrollbar-none">
            <TabsContent
              value="details"
              className="mt-0 space-y-10 focus-visible:outline-none"
            >
              {/* PAX & Metadata */}
              <section className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-400 font-black text-[10px] uppercase tracking-widest ml-1">
                    Adults
                  </Label>
                  <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl"
                      onClick={() =>
                        updateFolioField(
                          'adults',
                          Math.max(1, (folio.adults || 1) - 1),
                        )
                      }
                    >
                      -
                    </Button>
                    <span className="flex-1 text-center font-bold text-lg">
                      {folio.adults || 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl"
                      onClick={() =>
                        updateFolioField('adults', (folio.adults || 1) + 1)
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 font-black text-[10px] uppercase tracking-widest ml-1">
                    Children
                  </Label>
                  <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl"
                      onClick={() =>
                        updateFolioField(
                          'children',
                          Math.max(0, (folio.children || 0) - 1),
                        )
                      }
                    >
                      -
                    </Button>
                    <span className="flex-1 text-center font-bold text-lg">
                      {folio.children || 0}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-xl"
                      onClick={() =>
                        updateFolioField('children', (folio.children || 0) + 1)
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>
              </section>

              {/* Room Assignments */}
              <section className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <BedDouble className="w-3 h-3" /> Room Assignments
                  </h4>
                  <SelectRoom
                    onAdd={handleAddRoom}
                    rooms={availableRooms}
                    existingIds={assignments.map((a) => a.roomId!)}
                  />
                </div>
                <div className="space-y-3">
                  {assignments.map((a) => (
                    <Card
                      key={a.id}
                      className="border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:border-primary/20 transition-colors"
                    >
                      <CardContent className="p-4 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center font-black text-primary border border-slate-100">
                            {a.Room?.roomNumber || '??'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {a.RoomType?.name || 'Standard Room'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              {a.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Nightly Rate
                            </p>
                            <PriceOverrideInput
                              initialValue={Number(
                                a.priceOverride ||
                                  a.RoomType?.defaultPrice ||
                                  0,
                              )}
                              onSave={(newRate) =>
                                handleUpdateAssignment(a.id, {
                                  priceOverride: newRate,
                                })
                              }
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => handleRemoveRoom(a.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Stay Timeline */}
              <section className="space-y-3">
                <Label className="text-slate-400 font-black text-[10px] uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Stay Timeline
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Check In
                    </p>
                    <Input
                      type="datetime-local"
                      className="h-12 rounded-xl text-xs font-bold"
                      value={format(
                        toZonedTime(
                          new Date(folio.checkInDate),
                          property?.timezone || 'UTC',
                        ),
                        "yyyy-MM-dd'T'HH:mm",
                      )}
                      onChange={(e) =>
                        updateFolioField('checkInDate', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Check Out
                    </p>
                    <Input
                      type="datetime-local"
                      className="h-12 rounded-xl text-xs font-bold"
                      value={format(
                        toZonedTime(
                          new Date(folio.checkOutDate),
                          property?.timezone || 'UTC',
                        ),
                        "yyyy-MM-dd'T'HH:mm",
                      )}
                      onChange={(e) =>
                        updateFolioField('checkOutDate', e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Receipt className="w-3 h-3" /> Guest GSTIN
                    </p>
                    <Input
                      className="h-12 rounded-xl text-xs font-bold bg-slate-50 border-slate-100 uppercase"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      onBlur={(e) => handleUpdateGstin(e.target.value)}
                      placeholder="GSTIN if required"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <FileText className="w-3 h-3" /> GR Number
                    </p>
                    <Input
                      className="h-12 rounded-xl text-xs font-bold bg-slate-50 border-slate-100 uppercase"
                      value={grNumber}
                      onChange={(e) =>
                        setGrNumber(e.target.value.toUpperCase())
                      }
                      onBlur={(e) => handleUpdateGrNumber(e.target.value)}
                      placeholder="GR Number"
                    />
                  </div>
                </div>
              </section>

              {/* Notes Section */}
              <section className="space-y-3">
                <Label className="text-slate-400 font-black text-[10px] uppercase tracking-widest ml-1 flex items-center gap-2">
                  <FileText className="w-3 h-3" /> Folio Notes
                </Label>
                <textarea
                  className="w-full bg-amber-50/50 border border-amber-100 p-4 rounded-2xl text-xs font-bold text-amber-900/60 leading-relaxed italic outline-none focus:border-amber-200 transition-colors"
                  rows={4}
                  value={folio.notes || ''}
                  onChange={(e) =>
                    setFolio({ ...folio, notes: e.target.value })
                  }
                  onBlur={(e) => updateFolioField('notes', e.target.value)}
                  placeholder="Special requests, flight details, etc."
                />
              </section>
            </TabsContent>

            <TabsContent
              value="folio"
              className="mt-0 space-y-8 focus-visible:outline-none"
            >
              {/* Ledger details here */}
              <section className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Receipt className="w-3 h-3" /> Digital Ledger
                  </h4>
                  <SelectService
                    onAdd={handleAddService}
                    services={availableServices}
                    existingIds={[]}
                  />
                </div>
                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group"
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                          <BedDouble className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">
                            Room {a.Room?.roomNumber} Stay
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {totalNights} nights x ₹
                            {(
                              Number(a.priceOverride) ||
                              Number(a.RoomType?.defaultPrice) ||
                              0
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">
                          ₹
                          {(
                            Number(a.priceOverride) ||
                            Number(a.RoomType?.defaultPrice) ||
                            0
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {services.map((s) => (
                    <div
                      key={s.id}
                      className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all"
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">
                            {s.Service?.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 bg-slate-100 rounded-sm"
                              onClick={() =>
                                updateServiceQuantity(
                                  s.id,
                                  (s.quantity ?? 0) - 1,
                                )
                              }
                            >
                              -
                            </Button>
                            <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">
                              {s.quantity}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 bg-slate-100 rounded-sm"
                              onClick={() =>
                                updateServiceQuantity(
                                  s.id,
                                  (s.quantity ?? 0) + 1,
                                )
                              }
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-black text-slate-900">
                          ₹{Number(s.totalPrice).toLocaleString()}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => handleRemoveService(s.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <Card className="border-none bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-900/20">
                <CardContent className="p-8 space-y-4">
                  <SummaryRow label="Stay Subtotal" value={totalRoomCharges} />
                  <SummaryRow label="Services & F&B" value={serviceSubtotal} />
                  <SummaryRow
                    label="Discount"
                    value={-discount}
                    className="text-emerald-400"
                  />
                  <SummaryRow label="Tax Amount" value={taxAmount} />

                  <div className="pt-4 flex items-center justify-between border-t border-white/5 gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="waive-day"
                        checked={folio?.waiveLastDayCharge || false}
                        onChange={handleToggleWaiver}
                        className="w-5 h-5 rounded-md accent-primary cursor-pointer bg-white/10 border-white/20"
                      />
                      <label
                        htmlFor="waive-day"
                        className="text-white/60 text-xs font-black uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
                      >
                        Waive Day
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="show-tax"
                        checked={showTax}
                        onChange={(e) => setShowTax(e.target.checked)}
                        className="w-5 h-5 rounded-md accent-primary cursor-pointer bg-white/10 border-white/20"
                      />
                      <label
                        htmlFor="show-tax"
                        className="text-white/60 text-xs font-black uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
                      >
                        Include Tax
                      </label>
                    </div>
                  </div>

                  <div className="pt-6 mt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-4xl font-heading font-black tracking-tighter text-white">
                      ₹{total.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {payments.length > 0 && (
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Payment History
                  </h4>
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center p-4 bg-slate-50/30 rounded-2xl border border-slate-100"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900">
                            {p.method}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400">
                            {format(
                              new Date(p.createdAt ?? ''),
                              'dd MMM yyyy, hh:mm a',
                            )}
                          </p>
                        </div>
                        <p className="font-black text-emerald-600">
                          ₹{Number(p.amount).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </TabsContent>
          </div>

          {/* Footer Actions */}
          <div className="p-8 border-t border-slate-100 bg-white flex gap-4 shrink-0">
            <Dialog
              open={isInvoicePreviewOpen}
              onOpenChange={setIsInvoicePreviewOpen}
            >
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-none shadow-2xl">
                <div className="p-10 space-y-8 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-4xl font-heading font-black tracking-tighter text-slate-900 leading-none">
                        Invoice Preview
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                        Verify details before processing
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => handleGenerateInvoice('print')}
                        disabled={isGeneratingInvoice}
                        className="rounded-xl font-black text-[10px] uppercase tracking-widest h-12 px-6 border-slate-200 hover:bg-slate-50"
                      >
                        {isGeneratingInvoice ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Processing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Printer className="w-4 h-4" />
                            <span>Print</span>
                          </div>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleGenerateInvoice('download')}
                        disabled={isGeneratingInvoice}
                        className="rounded-xl font-black text-[10px] uppercase tracking-widest h-12 px-6 bg-slate-900 hover:bg-slate-800"
                      >
                        {isGeneratingInvoice ? (
                          <div className="flex items-center gap-2 text-white">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Generating...</span>
                          </div>
                        ) : (
                          'Download PDF'
                        )}
                      </Button>
                    </div>
                  </div>

                  {isGeneratingInvoice && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center p-8 bg-primary/5 rounded-3xl border border-primary/10 border-dashed"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm font-bold text-primary italic">
                          Invoice is being generated...
                        </p>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-8 p-8 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Guest
                        </p>
                        <p className="font-black text-slate-900">
                          {folio.Guest?.name}
                        </p>
                        {gstin && (
                          <p className="text-[10px] font-bold text-primary mt-1">
                            GSTIN: {gstin}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Stay
                        </p>
                        <p className="font-bold text-slate-600 text-sm">
                          {format(new Date(folio.checkInDate), 'dd MMM')} -{' '}
                          {format(new Date(folio.checkOutDate), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-500">
                          Accommodation ({totalNights} nights)
                        </span>
                        <span className="text-slate-900">
                          ₹{totalRoomCharges.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-500">
                          Services & Extras
                        </span>
                        <span className="text-slate-900">
                          ₹{serviceSubtotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-emerald-600">
                        <span>Discount</span>
                        <span>- ₹{discount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-500">
                          Tax{' '}
                          {showTax
                            ? `(${property?.taxPercentage}%)`
                            : '(Excluded)'}
                        </span>
                        <span className="text-slate-900">
                          ₹{taxAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-sm font-black uppercase tracking-widest text-slate-400">
                          Total Payable
                        </span>
                        <span className="text-2xl font-heading font-black text-primary">
                          ₹{total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <p className="text-[10px] font-bold text-amber-800 leading-tight italic">
                      This is a digital preview. The generated PDF will include
                      full property details, payment breakup, and authorized
                      signature blocks.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-16 w-16 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:bg-white hover:border-primary transition-all shrink-0"
                  />
                }
              >
                <MoreHorizontal className="size-6 text-slate-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-64 rounded-2xl p-2 shadow-2xl border-slate-100"
              >
                <DropdownMenuItem
                  onClick={() => setIsInvoicePreviewOpen(true)}
                  className="rounded-xl h-12 font-bold"
                >
                  <Receipt className="mr-2 size-4" /> Invoice Preview
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleGenerateInvoice('print')}
                  className="rounded-xl h-12 font-bold"
                >
                  <Printer className="mr-2 size-4" /> Print Invoice
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleGenerateInvoice('download')}
                  className="rounded-xl h-12 font-bold"
                >
                  <Download className="mr-2 size-4" /> Download PDF
                </DropdownMenuItem>
                {totalDue > 0 && (
                  <DropdownMenuItem
                    onClick={() => setIsPaymentDialogOpen(true)}
                    className="rounded-xl h-12 font-bold text-primary"
                  >
                    <CreditCard className="mr-2 size-4" /> Record Payment
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="rounded-xl h-12 font-bold text-red-600">
                  <Trash2 className="mr-2 size-4" /> Cancel Booking
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {folio.status === 'CONFIRMED' ? (
              <Button
                onClick={handleCheckIn}
                disabled={loading}
                className="flex-1 h-16 rounded-2xl bg-emerald-500 shadow-xl shadow-emerald-500/20 font-heading font-black tracking-tighter text-lg hover:scale-[1.01] transition-all"
              >
                <LogIn className="size-6 text-white" />
                {loading ? 'PROCESSING...' : 'CHECK IN'}
              </Button>
            ) : totalDue > 0 ? (
              <Button
                onClick={() => setIsPaymentDialogOpen(true)}
                disabled={loading}
                className="flex-1 h-16 rounded-2xl bg-primary shadow-xl shadow-primary/20 font-heading font-black tracking-tighter text-lg hover:scale-[1.01] transition-all"
              >
                <CreditCard className="size-6 text-white" />
                RECORD PAYMENT
              </Button>
            ) : folio.status === 'CHECKED_IN' ? (
              <Button
                onClick={handleCheckOut}
                disabled={loading}
                className="flex-1 h-16 rounded-2xl bg-amber-500 shadow-xl shadow-amber-500/20 font-heading font-black tracking-tighter text-lg hover:scale-[1.01] transition-all"
              >
                <LogOut className="size-6 text-white" />
                {loading ? 'PROCESSING...' : 'CHECK OUT'}
              </Button>
            ) : (
              <Button
                onClick={() => setIsInvoicePreviewOpen(true)}
                className="flex-1 h-16 rounded-2xl bg-slate-900 shadow-xl shadow-slate-900/20 font-heading font-black tracking-tighter text-lg hover:scale-[1.01] transition-all"
              >
                <Receipt className="size-6 text-white" />
                VIEW INVOICE
              </Button>
            )}

            <Dialog
              open={isPaymentDialogOpen}
              onOpenChange={setIsPaymentDialogOpen}
            >
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRecordPayment} className="space-y-6 pt-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <span className="text-sm font-black text-slate-500 uppercase tracking-widest">
                        Total Due
                      </span>
                      <span className="text-xl font-heading font-black text-slate-900">
                        ₹{totalDue.toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        name="amount"
                        type="number"
                        step="0.01"
                        required
                        defaultValue={totalDue}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select name="method" required defaultValue="CASH">
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="CREDIT_CARD">
                            Credit Card
                          </SelectItem>
                          <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="BANK_TRANSFER">
                            Bank Transfer
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl font-bold"
                  >
                    Confirm Payment
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

function SummaryRow({
  label,
  value,
  className = '',
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex justify-between items-center text-sm font-bold text-white/70',
        className,
      )}
    >
      <span>{label}</span>
      <span>
        {value < 0
          ? `- ₹${Math.abs(value).toLocaleString()}`
          : `₹${value.toLocaleString()}`}
      </span>
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
        className="bg-transparent border-none outline-none font-black text-sm w-16 text-slate-900"
      />
    </div>
  )
}

function SelectService({
  onAdd,
  services,
  existingIds,
}: {
  onAdd: (id: string) => void
  services: Service[]
  existingIds: string[]
}) {
  const options = services
    .filter((s) => !existingIds.includes(s.id))
    .map((s) => ({ value: s.id, label: `${s.name} - ₹${s.price}` }))
  console.log(options, existingIds, services)

  return (
    <div className="w-[180px]">
      <SearchableCombobox
        options={options}
        onChange={onAdd}
        placeholder="Post Service..."
        className="text-[9px] font-black uppercase tracking-widest bg-primary/5 border-none"
      />
    </div>
  )
}

function SelectRoom({
  onAdd,
  rooms,
  existingIds,
}: {
  onAdd: (id: string) => void
  rooms: Room[]
  existingIds: string[]
}) {
  const options = rooms
    .filter((r) => r.status === 'AVAILABLE' && !existingIds.includes(r.id))
    .map((r) => ({
      value: r.id,
      label: `Room ${r.roomNumber} - ${r.RoomType?.name}`,
    }))

  return (
    <div className="w-[180px]">
      <SearchableCombobox
        options={options}
        onChange={onAdd}
        placeholder="Add Room..."
        className="text-[9px] font-black uppercase tracking-widest bg-primary/5 border-none"
      />
    </div>
  )
}

import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tables } from '@/database.types'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { motion } from 'framer-motion'

