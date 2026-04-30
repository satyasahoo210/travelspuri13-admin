'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { createClient } from '@/lib/utils/supabase/client'
import { fromZonedTime } from 'date-fns-tz'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  BedDouble,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  LayoutDashboard,
  Loader2,
  Menu,
  Plus,
  Search,
  Store,
  UserCircle,
  UserPlus,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type EntityType =
  | 'Property'
  | 'RoomType'
  | 'Room'
  | 'Booking'
  | 'Employee'
  | 'Guest'
  | 'Service'
  | 'Inventory'
  | 'Order'
  | 'Product'
type Nullable<T> = T | null
type DropDownType = {
  properties: Nullable<Pick<Tables<'Property'>, 'id' | 'name' | 'timezone'>[]>
  roomTypes: Nullable<Pick<Tables<'RoomType'>, 'id' | 'name' | 'propertyId'>[]>
  guests: Nullable<Pick<Tables<'Guest'>, 'id' | 'name'>[]>
  products: Nullable<Pick<Tables<'Product'>, 'id' | 'name'>[]>
  rooms: Nullable<
    (Pick<Tables<'Room'>, 'id' | 'roomNumber'> & {
      RoomType: Pick<Tables<'RoomType'>, 'propertyId'>
    })[]
  >
  bookings: Nullable<
    (Pick<Tables<'Booking'>, 'id'> & { Guest: Pick<Tables<'Guest'>, 'name'> })[]
  >
}

export default function ManagePage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [activeEntity, setActiveEntity] = useState<EntityType>('Property')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dropdowns, setDropdowns] = useState<DropDownType>({} as DropDownType)

  // State for filtering & guest logic
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null,
  )
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('')
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [selectedGuestId, setSelectedGuestId] = useState<string>('')
  const [selectedBookingId, setSelectedBookingId] = useState<string>('')
  const [isQuickAddGuest, setIsQuickAddGuest] = useState(false)

  // Verify access (SUPER_ADMIN or TENANT_ADMIN)
  useEffect(() => {
    if (user?.role && !['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role)) {
      router.push('/dashboard')
    }
  }, [user, router])

  const fetchDropdowns = async () => {
    const { data: properties } = await supabase
      .from('Property')
      .select('id, name, timezone')
    const { data: roomTypes } = await supabase
      .from('RoomType')
      .select('id, name, propertyId')
    const { data: guests } = await supabase
      .from('Guest')
      .select('id, name')
      .order('name')
    const { data: products } = await supabase.from('Product').select('id, name')
    const { data: bookings } = await supabase
      .from('Booking')
      .select('id, Guest(name)')

    // Fetch rooms with propertyId from RoomType join
    const { data: rooms } = await supabase
      .from('Room')
      .select('id, roomNumber, RoomType!inner(propertyId)')

    setDropdowns({ properties, roomTypes, guests, products, rooms, bookings })
  }

  // Fetch dropdown data on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) fetchDropdowns()
  }, [user])

  const sidebarItems = [
    { id: 'Property', icon: Building2, label: 'Properties' },
    { id: 'RoomType', icon: BedDouble, label: 'Room Types' },
    { id: 'Room', icon: DoorOpen, label: 'Rooms' },
    { id: 'Booking', icon: CalendarCheck, label: 'Bookings' },
    { id: 'Employee', icon: Users, label: 'Employees' },
    { id: 'Guest', icon: UserCircle, label: 'Guests' },
    { id: 'Service', icon: ClipboardList, label: 'Services' },
    { id: 'Inventory', icon: ClipboardList, label: 'Inventory' },
    { id: 'Product', icon: Store, label: 'Products' },
    { id: 'Order', icon: UtensilsCrossed, label: 'Orders' },
  ]

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.target as HTMLFormElement)
    const data = Object.fromEntries(formData.entries())

    try {
      if (activeEntity === 'Employee') {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

        const response = await fetch(`${apiUrl}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            name: data.name,
            role: data.role,
            tenantId: user?.tenantId,
          }),
        })

        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.message || 'Failed to create employee')
        }

        setSuccess(`New Employee created successfully!`)
        ;(e.target as HTMLFormElement).reset()
        fetchDropdowns()
        return
      }

      let finalGuestId = data.guestId as string

      // Handle Guest ID Proof upload
      let idProofUrl = null
      const idProofFile = data.idProofFile as File
      if (idProofFile && idProofFile.size > 0) {
        const fileExt = idProofFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('guests')
          .upload(fileName, idProofFile)
        if (uploadError) throw uploadError
        idProofUrl = uploadData.path
      }

      // Handle Property Logo upload
      let logoUrl = null
      const logoFile = data.logoFile as File
      if (logoFile && logoFile.size > 0) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('properties')
          .upload(fileName, logoFile)
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage
          .from('properties')
          .getPublicUrl(uploadData.path)
        logoUrl = publicUrlData.publicUrl
      }

      // Handle Quick Add Guest
      if (activeEntity === 'Booking' && isQuickAddGuest) {
        const { data: newGuest, error: guestError } = await supabase
          .from('Guest')
          .insert([
            {
              name: data.quickGuestName as string,
              phone: data.quickGuestPhone as string,
              email: data.quickGuestEmail as string,
              address: data.quickGuestAddress as string,
              idProofType: data.quickGuestIdType as string,
              idProofNumber: data.quickGuestIdNumber as string,
              idProofUrl: idProofUrl,
              tenantId: user!.tenantId,
            },
          ])
          .select()
          .single()

        if (guestError) throw guestError
        finalGuestId = newGuest.id
      }

      // Tables that do NOT have a direct tenantId column
      const entitiesWithoutDirectTenant = ['RoomType', 'Room']

      let checkInDateStr = data.checkInDate as string
      let checkOutDateStr = data.checkOutDate as string

      if (activeEntity === 'Booking') {
        const propertyInfo = dropdowns.properties?.find(
          (p) => p.id === data.propertyId,
        )
        if (propertyInfo?.timezone && data.checkInDate && data.checkOutDate) {
          checkInDateStr = fromZonedTime(
            data.checkInDate as string,
            propertyInfo.timezone,
          ).toISOString()
          checkOutDateStr = fromZonedTime(
            data.checkOutDate as string,
            propertyInfo.timezone,
          ).toISOString()
        } else if (data.checkInDate && data.checkOutDate) {
          checkInDateStr = new Date(data.checkInDate as string).toISOString()
          checkOutDateStr = new Date(data.checkOutDate as string).toISOString()
        }
      }

      // Clean up quick guest fields & extra fields from payload
      const {
        quickGuestName,
        quickGuestPhone,
        quickGuestEmail,
        quickGuestAddress,
        quickGuestIdType,
        quickGuestIdNumber,
        roomId,
        idProofFile: _idProofFile,
        logoFile: _logoFile,
        overrideRate: _overrideRate,
        ...payloadData
      } = data

      const payload = {
        ...payloadData,
        ...(idProofUrl && activeEntity === 'Guest' ? { idProofUrl } : {}),
        ...(logoUrl && activeEntity === 'Property' ? { logoUrl } : {}),
        ...(!entitiesWithoutDirectTenant.includes(activeEntity)
          ? { tenantId: user?.tenantId }
          : {}),
        ...(activeEntity === 'Booking'
          ? {
              guestId: finalGuestId,
              checkInDate: checkInDateStr,
              checkOutDate: checkOutDateStr,
            }
          : {}),
        // Convert numbers if needed
        ...(data.price ? { price: parseFloat(data.price as string) } : {}),
        ...(data.capacity
          ? { capacity: parseInt(data.capacity as string) }
          : {}),
        ...(data.quantity
          ? { quantity: parseInt(data.quantity as string) }
          : {}),
        ...(data.taxPercentage
          ? { taxPercentage: parseFloat(data.taxPercentage as string) }
          : {}),
        ...(data.totalRooms
          ? { totalRooms: parseInt(data.totalRooms as string) }
          : {}),
        ...(data.availableRooms
          ? { availableRooms: parseInt(data.availableRooms as string) }
          : {}),
        ...(data.totalAmount
          ? { totalAmount: parseFloat(data.totalAmount as string) }
          : {}),
      }

      const { data: dbData, error: dbError } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(activeEntity as any)
        .insert([payload])
        .select()
        .single()

      if (dbError) throw dbError

      // Handle linked assignment for Booking
      if (activeEntity === 'Booking' && dbData) {
        // Fetch roomTypeId for the selected room
        const { data: roomInfo } = await supabase
          .from('Room')
          .select('roomTypeId')
          .eq('id', roomId as string)
          .single()

        if (roomInfo) {
          await supabase.from('BookingRoom').insert([
            {
              // @ts-expect-error dbData is not typed
              bookingId: dbData.id,
              roomId: roomId as string,
              roomTypeId: roomInfo.roomTypeId,
              priceOverride: data.overrideRate
                ? parseFloat(data.overrideRate as string)
                : null,
              status: 'CONFIRMED',
            },
          ])
        }
      }

      setSuccess(`New ${activeEntity} created successfully!`)
      fetchDropdowns() // Refresh dropdown data
      ;(e.target as HTMLFormElement).reset()
      setSelectedPropertyId(null)
      setIsQuickAddGuest(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err)
      setError(err.message || `Failed to create ${activeEntity}`)
    } finally {
      setLoading(false)
    }
  }

  const renderFormFields = () => {
    switch (activeEntity) {
      case 'Property':
        return (
          <>
            <div className="space-y-2">
              <Label>Property Name</Label>
              <Input name="name" required placeholder="Luxury Suites" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input name="address" required placeholder="123 Ocean Drive" />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input name="timezone" required placeholder="Asia/Kolkata" />
            </div>
            <div className="space-y-2">
              <Label>Tax Percentage (%)</Label>
              <Input
                name="taxPercentage"
                type="number"
                step="0.01"
                defaultValue="0"
              />
            </div>
            <div className="space-y-2 col-span-full">
              <Label>Property Logo (Optional)</Label>
              <Input
                name="logoFile"
                type="file"
                accept="image/*"
                className="pt-3"
              />
            </div>
          </>
        )
      case 'RoomType':
        return (
          <>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input name="name" required placeholder="Deluxe Ocean View" />
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input name="capacity" type="number" required placeholder="2" />
            </div>
            <div className="space-y-2">
              <Label>Default Price</Label>
              <Input
                name="defaultPrice"
                type="number"
                step="0.01"
                required
                placeholder="5000"
              />
            </div>
            <div className="space-y-2">
              <Label>Property</Label>
              <SearchableCombobox
                name="propertyId"
                value={selectedPropertyId || ''}
                onChange={(v) => setSelectedPropertyId(v)}
                options={
                  dropdowns.properties?.map((p) => ({
                    value: p.id,
                    label: p.name,
                  })) || []
                }
                placeholder="Select Property"
              />
            </div>
          </>
        )
      case 'Room':
        return (
          <>
            <div className="space-y-2">
              <Label>Room Number</Label>
              <Input name="roomNumber" required placeholder="101" />
            </div>
            <div className="space-y-2">
              <Label>Room Type</Label>
              <SearchableCombobox
                name="roomTypeId"
                value={selectedRoomTypeId}
                onChange={setSelectedRoomTypeId}
                options={
                  dropdowns.roomTypes?.map((rt) => ({
                    value: rt.id,
                    label: rt.name,
                  })) || []
                }
                placeholder="Select Room Type"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue="AVAILABLE">
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="OCCUPIED">Occupied</SelectItem>
                  <SelectItem value="DIRTY">Dirty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )
      case 'Booking':
        return (
          <>
            <div className="col-span-full mb-4 flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  {isQuickAddGuest ? (
                    <UserPlus className="w-5 h-5" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tighter text-slate-900">
                    Guest Details
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {isQuickAddGuest
                      ? 'Create a new guest record'
                      : 'Select from existing database'}
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
              <>
                <div className="space-y-2">
                  <Label>Guest Name</Label>
                  <Input
                    name="quickGuestName"
                    required
                    placeholder="Full Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input name="quickGuestPhone" placeholder="+1-xxx-xxx-xxxx" />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label>Address</Label>
                  <Input name="quickGuestAddress" placeholder="Full Address" />
                </div>
                <div className="space-y-2">
                  <Label>ID Proof Type</Label>
                  <Select name="quickGuestIdType" defaultValue="Aadhar Card">
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aadhar Card">Aadhar Card</SelectItem>
                      <SelectItem value="PAN Card">PAN Card</SelectItem>
                      <SelectItem value="Passport">Passport</SelectItem>
                      <SelectItem value="Driving License">
                        Driving License
                      </SelectItem>
                      <SelectItem value="Voter ID">Voter ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ID Proof Number</Label>
                  <Input
                    name="quickGuestIdNumber"
                    placeholder="Enter ID Details"
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label>ID Proof Document (Optional)</Label>
                  <Input
                    name="idProofFile"
                    type="file"
                    accept="image/*,.pdf"
                    className="pt-3"
                  />
                </div>
              </>
            ) : (
              <div className="col-span-full space-y-2">
                <Label>Select Guest</Label>
                <SearchableCombobox
                  name="guestId"
                  value={selectedGuestId}
                  onChange={setSelectedGuestId}
                  options={
                    dropdowns.guests?.map((g) => ({
                      value: g.id,
                      label: g.name,
                    })) || []
                  }
                  placeholder="Search Guest Name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Property</Label>
              <SearchableCombobox
                name="propertyId"
                value={selectedPropertyId || ''}
                onChange={setSelectedPropertyId}
                options={
                  dropdowns.properties?.map((p) => ({
                    value: p.id,
                    label: p.name,
                  })) || []
                }
                placeholder="Select Property"
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Room</Label>
              <SearchableCombobox
                name="roomId"
                value={selectedRoomId}
                onChange={setSelectedRoomId}
                disabled={!selectedPropertyId}
                options={
                  dropdowns.rooms
                    ?.filter(
                      (r) => r.RoomType.propertyId === selectedPropertyId,
                    )
                    ?.map((r) => ({ value: r.id, label: r.roomNumber })) || []
                }
                placeholder={
                  selectedPropertyId ? 'Select Room' : 'Select Property First'
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Check-In Date</Label>
              <Input name="checkInDate" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label>Override Rate (Per Night)</Label>
              <Input
                name="overrideRate"
                type="number"
                step="0.01"
                placeholder="Override default room price (Optional)"
              />
            </div>
            <div className="space-y-2 col-span-full">
              <Label>Booking Notes</Label>
              <Input
                name="notes"
                placeholder="Special requests, instructions, etc."
              />
            </div>
          </>
        )
      case 'Employee':
        return (
          <>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input name="name" required placeholder="Alex Johnson" />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                name="email"
                type="email"
                required
                placeholder="alex@hotel.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>System Role</Label>
              <Select name="role" defaultValue="STAFF">
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROPERTY_MANAGER">
                    Property Manager
                  </SelectItem>
                  <SelectItem value="STAFF">Staff / Receptionist</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )
      case 'Guest':
        return (
          <>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input name="name" required placeholder="Guest Name" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input name="phone" placeholder="+1234567890" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                name="email"
                type="email"
                placeholder="guest@example.com"
              />
            </div>
            <div className="space-y-2 col-span-full">
              <Label>Address</Label>
              <Input name="address" placeholder="Full Address" />
            </div>
            <div className="space-y-2">
              <Label>ID Proof Type</Label>
              <Select name="idProofType" defaultValue="Aadhar Card">
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aadhar Card">Aadhar Card</SelectItem>
                  <SelectItem value="PAN Card">PAN Card</SelectItem>
                  <SelectItem value="Passport">Passport</SelectItem>
                  <SelectItem value="Driving License">
                    Driving License
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ID Proof Number</Label>
              <Input name="idProofNumber" placeholder="ID Number" />
            </div>
            <div className="space-y-2 col-span-full">
              <Label>ID Proof Document (Image/PDF)</Label>
              <Input
                name="idProofFile"
                type="file"
                accept="image/*,.pdf"
                className="pt-3"
              />
            </div>
          </>
        )
      case 'Service':
        return (
          <>
            <div className="space-y-2">
              <Label>Property</Label>
              <SearchableCombobox
                name="propertyId"
                value={selectedPropertyId || ''}
                onChange={setSelectedPropertyId}
                options={
                  dropdowns.properties?.map((p) => ({
                    value: p.id,
                    label: p.name,
                  })) || []
                }
                placeholder="Select Property"
              />
            </div>
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input name="name" required placeholder="Laundry" />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input name="price" type="number" step="0.01" required />
            </div>
          </>
        )
      case 'Inventory':
        return (
          <>
            <div className="space-y-2">
              <Label>Room Type</Label>
              <SearchableCombobox
                name="roomTypeId"
                value={selectedRoomTypeId}
                onChange={setSelectedRoomTypeId}
                options={
                  dropdowns.roomTypes?.map((rt) => ({
                    value: rt.id,
                    label: rt.name,
                  })) || []
                }
                placeholder="Select Room Type"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input name="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label>Total Rooms</Label>
              <Input name="totalRooms" type="number" required />
            </div>
          </>
        )
      case 'Product':
        return (
          <>
            <div className="space-y-2">
              <Label>Property</Label>
              <SearchableCombobox
                name="propertyId"
                value={selectedPropertyId || ''}
                onChange={setSelectedPropertyId}
                options={
                  dropdowns.properties?.map((p) => ({
                    value: p.id,
                    label: p.name,
                  })) || []
                }
                placeholder="Select Property"
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input name="name" required placeholder="Coca Cola" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input name="category" required placeholder="Beverage" />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input name="price" type="number" step="0.01" required />
            </div>
          </>
        )
      case 'Order':
        return (
          <>
            <div className="space-y-2">
              <Label>Property</Label>
              <SearchableCombobox
                name="propertyId"
                value={selectedPropertyId || ''}
                onChange={setSelectedPropertyId}
                options={
                  dropdowns.properties?.map((p) => ({
                    value: p.id,
                    label: p.name,
                  })) || []
                }
                placeholder="Select Property"
              />
            </div>
            <div className="space-y-2">
              <Label>Booking (Optional)</Label>
              <SearchableCombobox
                name="bookingId"
                value={selectedBookingId}
                onChange={setSelectedBookingId}
                options={
                  dropdowns.bookings?.map((b) => ({
                    value: b.id,
                    label: b.Guest.name,
                  })) || []
                }
                placeholder="Link to Guest Booking"
              />
            </div>
            <div className="space-y-2">
              <Label>Table Number</Label>
              <Input name="tableNumber" placeholder="Table 5" />
            </div>
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input name="totalAmount" type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue="PENDING">
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PREPARING">Preparing</SelectItem>
                  <SelectItem value="SERVED">Served</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="h-full bg-white border-r border-slate-200 flex flex-col z-20 shadow-sm"
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          {isSidebarOpen && (
            <span className="text-xl font-heading font-black tracking-tighter text-primary italic">
              MANAGE
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-slate-400 hover:text-slate-600"
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-none text-slate-900">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveEntity(item.id as EntityType)
                setSelectedPropertyId(null)
                setIsQuickAddGuest(false)
                setSuccess(null)
                setError(null)
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-black text-sm ${activeEntity === item.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'}`}
            >
              <item.icon
                className={`w-5 h-5 shrink-0 ${activeEntity === item.id ? 'text-white' : 'text-slate-400'}`}
              />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-black tracking-tighter"
            onClick={() => router.push('/dashboard')}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            {isSidebarOpen && 'Exit to Dashboard'}
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-12 relative selection:bg-primary/10">
        <div className="max-w-4xl mx-auto py-12">
          <div className="mb-12">
            <h1 className="text-6xl font-heading font-black tracking-tighter mb-4 text-slate-900 leading-none">
              Add {activeEntity}
            </h1>
            <p className="text-slate-500 text-lg font-bold">
              Central registry for initializing new {activeEntity} assets.
            </p>
          </div>

          {/* Notifications */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-8 bg-emerald-50 border border-emerald-100 text-emerald-600 p-6 rounded-3xl flex items-center gap-4"
              >
                <CheckCircle2 className="w-6 h-6" />
                <p className="font-black tracking-tight">{success}</p>
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-8 bg-red-50 border border-red-100 text-red-600 p-6 rounded-3xl flex items-center gap-4"
              >
                <AlertCircle className="w-6 h-6" />
                <p className="font-black tracking-tight">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="bg-white border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 relative z-10">
            <CardContent className="p-10 md:p-14">
              <form
                onSubmit={handleFormSubmit}
                className="space-y-8"
                key={activeEntity}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                  {renderFormFields()}
                </div>

                <div className="pt-10 border-t border-slate-100">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-20 rounded-3xl text-2xl font-heading font-black tracking-tighter shadow-2xl shadow-primary/30 hover:scale-[1.01] transition-all"
                  >
                    {loading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-8 h-8 mr-4" /> REGISTER{' '}
                        {activeEntity.toUpperCase()}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <style jsx global>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        input,
        select {
          background: #f8fafc !important; /* slate-50 */
          border-color: #e2e8f0 !important; /* slate-200 */
          border-radius: 1.25rem !important;
          height: 4rem !important;
          color: #0f172a !important; /* slate-900 */
          font-weight: 800 !important;
          padding-left: 1.25rem !important;
          font-size: 1rem !important;
        }
        input:focus {
          background: white !important;
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 5px rgba(var(--primary), 0.1) !important;
        }
        label {
          font-size: 0.7rem !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.2em !important;
          color: #94a3b8 !important; /* slate-400 */
          margin-left: 0.75rem !important;
          margin-bottom: 0.5rem !important;
          display: block !important;
        }
      `}</style>
    </div>
  )
}
