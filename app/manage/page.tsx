'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { gql, TypedDocumentNode } from '@apollo/client'
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react'
import { differenceInCalendarDays, differenceInDays, format } from 'date-fns'
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
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
  UserCircle,
  UserPlus,
  Users,
  UtensilsCrossed,
  X,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'

const PAGE_SIZE = 10

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
  properties: any[] | null
  roomTypes: any[] | null
  guests: any[] | null
  products: any[] | null
  rooms: any[] | null
  bookings: any[] | null
}

const GET_DEV_ENTITIES: TypedDocumentNode<
  { devEntities: { dataJson: string; count: number } },
  { entity: string; page: number; limit: number; search?: string | null }
> = gql`
  query GetDevEntities($entity: String!, $page: Int!, $limit: Int!, $search: String) {
    devEntities(entity: $entity, page: $page, limit: $limit, search: $search) {
      dataJson
      count
    }
  }
`

const GET_DEV_DROPDOWNS: TypedDocumentNode<
  {
    devDropdowns: {
      properties: string;
      roomTypes: string;
      guests: string;
      products: string;
      rooms: string;
      bookings: string;
    };
  }
> = gql`
  query GetDevDropdowns {
    devDropdowns {
      properties
      roomTypes
      guests
      products
      rooms
      bookings
    }
  }
`

const DEV_INSERT: TypedDocumentNode<
  { devInsert: string },
  { entity: string; dataJson: string }
> = gql`
  mutation DevInsert($entity: String!, $dataJson: String!) {
    devInsert(entity: $entity, dataJson: $dataJson)
  }
`

const DEV_UPDATE: TypedDocumentNode<
  { devUpdate: string },
  { entity: string; id: string; dataJson: string }
> = gql`
  mutation DevUpdate($entity: String!, $id: String!, $dataJson: String!) {
    devUpdate(entity: $entity, id: $id, dataJson: $dataJson)
  }
`

const DEV_DELETE: TypedDocumentNode<
  { devDelete: string },
  { entity: string; id: string }
> = gql`
  mutation DevDelete($entity: String!, $id: String!) {
    devDelete(entity: $entity, id: $id)
  }
`

const CREATE_USER: TypedDocumentNode<{ createUser: any }, { input: any }> = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      name
      role
      tenantId
    }
  }
`

export default function ManagePage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeEntity, setActiveEntity] = useState<EntityType>('Property')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Entity List State
  const [entities, setEntities] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])

  // State for filtering & guest logic
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null,
  )
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('')
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [selectedGuestId, setSelectedGuestId] = useState<string>('')
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  )
  const [isQuickAddGuest, setIsQuickAddGuest] = useState(false)

  // Apollo queries and mutations
  const { data: dropdownsData, refetch: refetchDropdowns } = useQuery(GET_DEV_DROPDOWNS, {
    skip: !user,
  })

  const [fetchEntitiesQuery] = useLazyQuery(GET_DEV_ENTITIES, {
    fetchPolicy: 'network-only',
  })

  const [devInsert] = useMutation(DEV_INSERT)
  const [devUpdate] = useMutation(DEV_UPDATE)
  const [devDelete] = useMutation(DEV_DELETE)
  const [createUser] = useMutation(CREATE_USER)

  const dropdowns = useMemo<DropDownType>(() => {
    if (!dropdownsData?.devDropdowns) {
      return {
        properties: [],
        roomTypes: [],
        guests: [],
        products: [],
        rooms: [],
        bookings: [],
      }
    }
    const { properties, roomTypes, guests, products, rooms, bookings } = dropdownsData.devDropdowns
    return {
      properties: properties ? JSON.parse(properties) : [],
      roomTypes: roomTypes ? JSON.parse(roomTypes) : [],
      guests: guests ? JSON.parse(guests) : [],
      products: products ? JSON.parse(products) : [],
      rooms: rooms ? JSON.parse(rooms) : [],
      bookings: bookings ? JSON.parse(bookings) : [],
    }
  }, [dropdownsData])

  // Sync selection states with editingItem
  useEffect(() => {
    if (editingItem) {
      if (editingItem.propertyId) setSelectedPropertyId(editingItem.propertyId)
      if (editingItem.roomTypeId) setSelectedRoomTypeId(editingItem.roomTypeId)
      if (editingItem.roomId) setSelectedRoomId(editingItem.roomId)
      if (editingItem.guestId) setSelectedGuestId(editingItem.guestId)
      if (editingItem.bookingId) setSelectedBookingId(editingItem.bookingId)
      if (editingItem.photos) {
        setExistingPhotos(editingItem.photos)
      } else {
        setExistingPhotos([])
      }
    } else {
      setSelectedPropertyId(null)
      setSelectedRoomTypeId('')
      setSelectedRoomId('')
      setSelectedGuestId('')
      setSelectedBookingId('')
      setIsQuickAddGuest(false)
      setExistingPhotos([])
    }
  }, [editingItem])

  // Verify access (SUPER_ADMIN or TENANT_ADMIN)
  useEffect(() => {
    if (user?.role && !['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role)) {
      router.push('/dashboard')
    }
  }, [user, router])

  const fetchDropdownsFunc = async () => {
    await refetchDropdowns()
  }

  const fetchEntities = async () => {
    if (!user) return
    setLoading(true)

    try {
      const { data } = await fetchEntitiesQuery({
        variables: {
          entity: activeEntity,
          page: currentPage,
          limit: PAGE_SIZE,
          search: searchQuery || null,
        },
      })

      if (data?.devEntities) {
        setEntities(JSON.parse(data.devEntities.dataJson) || [])
        setTotalCount(data.devEntities.count || 0)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntities()
  }, [activeEntity, currentPage, searchQuery])

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
      if (!editingItem && activeEntity === 'Property' && user?.role !== 'SUPER_ADMIN') {
        throw new Error('Only Super Admins are allowed to register new properties.')
      }

      let dbData = null

      if (activeEntity === 'Employee') {
        const { data: userData } = await createUser({
          variables: {
            input: {
              email: data.email as string,
              password: data.password as string,
              name: data.name as string,
              role: data.role as any,
              tenantId: user?.tenantId || null,
            },
          },
        })
        dbData = userData?.createUser

        setSuccess(
          `Employee ${editingItem ? 'updated' : 'created'} successfully!`,
        )
        setIsDialogOpen(false)
        setEditingItem(null)
          ; (e.target as HTMLFormElement).reset()
        fetchEntities()
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

      // Handle Photos upload for Property & RoomType
      let uploadedPhotoUrls: string[] = []
      const photosFiles = formData.getAll('photosFiles') as File[]

      if (photosFiles && photosFiles.length > 0) {
        for (const file of photosFiles) {
          if (file.size > 0) {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('properties')
              .upload(fileName, file)
            if (uploadError) throw uploadError
            const { data: publicUrlData } = supabase.storage
              .from('properties')
              .getPublicUrl(uploadData.path)
            uploadedPhotoUrls.push(publicUrlData.publicUrl)
          }
        }
      }

      // Combine existing photos with uploaded ones
      const finalPhotos = [...existingPhotos, ...uploadedPhotoUrls]

      // Handle Quick Add Guest
      if (activeEntity === 'Booking' && isQuickAddGuest) {
        const guestRes = await devInsert({
          variables: {
            entity: 'Guest',
            dataJson: JSON.stringify({
              name: data.quickGuestName as string,
              phone: data.quickGuestPhone as string,
              email: data.quickGuestEmail as string,
              address: data.quickGuestAddress as string,
              idProofType: data.quickGuestIdType as string,
              idProofNumber: data.quickGuestIdNumber as string,
              idProofUrl: idProofUrl,
              tenantId: user!.tenantId,
            }),
          },
        })
        const newGuest = JSON.parse(guestRes.data?.devInsert || '{}')
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
        photosFiles: _photosFiles,
        overrideRate: _overrideRate,
        numberOfRooms,
        ...payloadData
      } = data

      const payload = {
        ...payloadData,
        ...(idProofUrl && activeEntity === 'Guest' ? { idProofUrl } : {}),
        ...(logoUrl && activeEntity === 'Property' ? { logoUrl } : {}),
        ...(activeEntity === 'Property' || activeEntity === 'RoomType' ? { photos: finalPhotos } : {}),
        ...(!entitiesWithoutDirectTenant.includes(activeEntity)
          ? { tenantId: user?.tenantId }
          : {}),
        ...(activeEntity === 'Booking'
          ? (() => {
            const start = new Date(checkInDateStr)
            const end = new Date(checkOutDateStr)

            const propertyInfo = dropdowns.properties?.find(
              (p) => p.id === data.propertyId,
            )

            const propertySettings = propertyInfo?.settings as { checkoutTime?: string, taxAmount?: number, defaultTaxEnabled?: boolean, checkinTime?: string } | null

            // 1. Base nights = calendar days
            let nights = differenceInCalendarDays(end, start)

            // 2. Time-based logic
            const checkOutTimeStr = format(end, 'HH:mm:ss')
            const propCheckOutTime = propertySettings?.checkoutTime
              ? `${propertySettings.checkoutTime}:00`
              : (propertyInfo?.checkOutTime || '07:00:00')
            if (checkOutTimeStr > propCheckOutTime) {
              nights += 1
            }

            // 3. Waiver
            if (
              data.waiveLastDayCharge === 'on' ||
              data.waiveLastDayCharge === 'true'
            ) {
              nights -= 1
            }

            nights = Math.max(1, nights)

            const selectedRoom = dropdowns.rooms?.find(
              (r) => r.id === (data.roomId as string),
            )
            const rate = data.overrideRate
              ? parseFloat(data.overrideRate as string)
              : Number(selectedRoom?.RoomType?.defaultPrice) || 0

            const subtotal = rate * nights
            const taxVal =
              subtotal * (((propertySettings?.taxAmount ?? propertyInfo?.taxPercentage) || 0) / 100)
            const totalAmount = subtotal + taxVal

            return {
              guestId: finalGuestId,
              checkInDate: checkInDateStr,
              checkOutDate: checkOutDateStr,
              totalAmount: totalAmount,
              adults: parseInt(data.adults as string) || 1,
              children: parseInt(data.children as string) || 0,
            }
          })()
          : {}),
        // Convert numbers if needed
        ...(data.price ? { price: parseFloat(data.price as string) } : {}),
        ...(data.capacity
          ? { capacity: parseInt(data.capacity as string) }
          : {}),
        ...(data.quantity
          ? { quantity: parseInt(data.quantity as string) }
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
        ...(activeEntity === 'Property' ? {
          settings: {
            ...(editingItem?.settings || {}),
            taxAmount: parseFloat(data.taxAmount as string) || 0,
            defaultTaxEnabled: data.defaultTaxEnabled === 'on',
            checkinTime: data.checkinTime as string,
            checkoutTime: data.checkoutTime as string,
          }
        } : {}),
      }

      // Remove deprecated fields from Property payload
      if (activeEntity === 'Property') {
        delete (payload as any).taxPercentage
        delete (payload as any).taxAmount
        delete (payload as any).defaultTaxEnabled
        delete (payload as any).checkinTime
        delete (payload as any).checkoutTime
        delete (payload as any).checkInTime
        delete (payload as any).checkOutTime
      }

      if (editingItem) {
        const res = await devUpdate({
          variables: {
            entity: activeEntity,
            id: editingItem.id,
            dataJson: JSON.stringify(payload),
          },
        })
        dbData = JSON.parse(res.data?.devUpdate || '{}')
      } else if (
        activeEntity === 'Room' &&
        parseInt(numberOfRooms as string) > 1
      ) {
        const startNum = parseInt(data.roomNumber as string)
        const count = parseInt(numberOfRooms as string)
        const payloads = Array.from({ length: count }, (_, i) => ({
          ...payload,
          roomNumber: (startNum + i).toString(),
        }))
        const res = await devInsert({
          variables: {
            entity: 'Room',
            dataJson: JSON.stringify(payloads),
          },
        })
        dbData = JSON.parse(res.data?.devInsert || '[]')
      } else {
        const res = await devInsert({
          variables: {
            entity: activeEntity,
            dataJson: JSON.stringify(payload),
          },
        })
        dbData = JSON.parse(res.data?.devInsert || '{}')
      }

      // Handle linked assignment for Booking
      if (activeEntity === 'Booking' && dbData) {
        // Fetch roomTypeId for the selected room from dropdowns
        const roomInfo = dropdowns.rooms?.find((r) => r.id === (roomId as string))

        if (roomInfo) {
          await devInsert({
            variables: {
              entity: 'BookingRoom',
              dataJson: JSON.stringify({
                bookingId: dbData.id,
                roomId: roomId as string,
                roomTypeId: roomInfo.roomTypeId || roomInfo.RoomType?.id || roomInfo.RoomType?.roomTypeId,
                priceOverride: data.overrideRate
                  ? parseFloat(data.overrideRate as string)
                  : null,
                status: 'CONFIRMED',
              }),
            },
          })
        }
      }

      setSuccess(
        `${activeEntity} ${editingItem ? 'updated' : 'created'} successfully!`,
      )
      setIsDialogOpen(false)
      setEditingItem(null)
      fetchEntities()
      fetchDropdownsFunc()
        ; (e.target as HTMLFormElement).reset()
      setSelectedPropertyId(null)
      setIsQuickAddGuest(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err)
      setError(err.message || `Failed to save ${activeEntity}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this?')) return
    setLoading(true)
    try {
      await devDelete({
        variables: {
          entity: activeEntity,
          id,
        },
      })
      setSuccess(`${activeEntity} deleted successfully!`)
      fetchEntities()
      fetchDropdownsFunc()
    } catch (err: any) {
      setError(err.message || `Failed to delete ${activeEntity}`)
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'Booking Date',
      'Room',
      'Guest Name',
      'Contact Number',
      'ID Type',
      'ID Number',
      'Chek-in Date',
      'Check-Out Date',
      'Override rate',
    ]
    const data = [headers]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'bookings_template.xlsx')
  }

  const handleBulkUpload = async (file: File) => {
    if (!selectedPropertyId) {
      setError('Please select a property first')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataBuffer = e.target?.result
        const workbook = XLSX.read(dataBuffer, { type: 'binary', cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows: any[] = XLSX.utils.sheet_to_json(sheet)

        let successCount = 0
        let errorCount = 0

        for (const row of rows) {
          try {
            // 1. Find/Create Guest
            let guestId = ''
            const phoneStr = String(row['Contact Number'] || '')
            if (!phoneStr) throw new Error('Contact Number is missing')

            const existingGuest = dropdowns.guests?.find((g: any) => String(g.phone) === phoneStr)

            if (existingGuest) {
              guestId = existingGuest.id
            } else {
              const guestRes = await devInsert({
                variables: {
                  entity: 'Guest',
                  dataJson: JSON.stringify({
                    name: row['Guest Name'] || 'Unknown Guest',
                    phone: phoneStr,
                    idProofType: row['ID Type'] || null,
                    idProofNumber: String(row['ID Number'] || ''),
                    tenantId: user!.tenantId,
                  }),
                },
              })
              const newGuest = JSON.parse(guestRes.data?.devInsert || '{}')
              guestId = newGuest.id
            }

            // 2. Find Room
            const room = dropdowns.rooms?.find(
              (r: any) =>
                r.RoomType?.propertyId === selectedPropertyId &&
                String(r.roomNumber) === String(row['Room']),
            )

            if (!room) throw new Error(`Room ${row['Room']} not found in selected property`)

            // 3. Create Booking
            const checkIn = new Date(row['Chek-in Date'])
            const checkOut = new Date(row['Check-Out Date'])
            if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) throw new Error('Invalid dates')

            const propertyInfo = dropdowns.properties?.find(p => p.id === selectedPropertyId)
            const nights = Math.max(1, differenceInCalendarDays(checkOut, checkIn))
            const rate = parseFloat(row['Override rate']) || room.RoomType?.defaultPrice || 0
            const subtotal = rate * nights
            const propSettings = propertyInfo?.settings as { taxAmount?: number, defaultTaxEnabled?: boolean }
            const taxVal = propSettings?.defaultTaxEnabled ? subtotal * ((propSettings?.taxAmount || 0) / 100) : 0
            const totalAmount = subtotal + taxVal

            const bookingRes = await devInsert({
              variables: {
                entity: 'Booking',
                dataJson: JSON.stringify({
                  guestId,
                  propertyId: selectedPropertyId,
                  tenantId: user!.tenantId,
                  checkInDate: checkIn.toISOString(),
                  checkOutDate: checkOut.toISOString(),
                  totalAmount,
                  status: 'CHECKED_OUT',
                  createdAt: row['Booking Date'] ? new Date(row['Booking Date']).toISOString() : new Date().toISOString(),
                }),
              },
            })
            const booking = JSON.parse(bookingRes.data?.devInsert || '{}')

            // 4. Create BookingRoom
            await devInsert({
              variables: {
                entity: 'BookingRoom',
                dataJson: JSON.stringify({
                  bookingId: booking.id,
                  roomId: room.id,
                  roomTypeId: room.roomTypeId || room.RoomType?.id,
                  priceOverride: rate,
                  status: 'CHECKED_OUT',
                }),
              },
            })

            successCount++
          } catch (err: any) {
            console.error(`Row error: ${err.message}`, row)
            errorCount++
          }
        }

        setSuccess(`Bulk upload completed: ${successCount} successful, ${errorCount} failed.`)
        setIsBulkUploadOpen(false)
        fetchEntities()
      }
      reader.readAsArrayBuffer(file)
    } catch (err: any) {
      setError(err.message || 'Failed to process bulk upload')
    } finally {
      setLoading(false)
    }
  }


  const renderBulkUploadDialog = () => (
    <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
      <DialogContent className="sm:max-w-xl p-0 rounded-[3rem] border-none shadow-2xl">
        <div className="p-10 md:p-14">
          <DialogHeader className="mb-10">
            <DialogTitle className="text-4xl font-black text-slate-900 tracking-tighter">
              Bulk Upload Bookings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-8">
            <div className="space-y-4">
              <Label>Target Property</Label>
              <Select
                value={selectedPropertyId || ''}
                onValueChange={setSelectedPropertyId}
              >
                <SelectTrigger className="h-16 rounded-2xl border-slate-100 bg-slate-50 font-bold">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                  {dropdowns.properties?.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="font-bold py-3">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-8 rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/50 flex flex-col items-center gap-4 text-center group hover:border-primary/50 transition-colors">
              <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <ClipboardList className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-black text-slate-900 tracking-tight">Upload Excel or CSV</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Maximum file size 5MB</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleBulkUpload(file)
                }}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl font-black text-[10px] tracking-widest uppercase px-6 border-slate-200 bg-white hover:bg-slate-50"
              >
                Select File
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              <Button
                variant="ghost"
                onClick={downloadTemplate}
                className="text-primary font-black text-xs tracking-widest uppercase hover:bg-primary/5 rounded-xl h-12"
              >
                Download Template File
              </Button>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-relaxed">
                  Important: Ensure headers match exactly as in the template.
                  Dates should be in YYYY-MM-DD format.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  const renderEntityList = () => {
    const configs: Record<string, string[]> = {
      Property: ['name', 'address', 'timezone'],
      RoomType: ['name', 'capacity', 'defaultPrice'],
      Room: ['RoomType.name', 'roomNumber', 'status'],
      Booking: ['Guest.name', 'checkInDate', 'checkOutDate', 'status'],
      Employee: ['name', 'email', 'role'],
      Guest: ['name', 'phone', 'email'],
      Service: ['name', 'price'],
      Product: ['name', 'category', 'price'],
      Order: ['tableNumber', 'totalAmount', 'status'],
    }

    const columns = configs[activeEntity] || []

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative flex-1 md:max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-primary" />
              <Input
                placeholder={`Search ${activeEntity}...`}
                className="pl-12! h-14 rounded-2xl text-sm border-slate-100 bg-white shadow-sm transition-all focus:ring-2 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(0)
                }}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-14 w-14 rounded-2xl border-slate-100 bg-white shadow-sm shrink-0 hover:bg-slate-50 active:scale-95 transition-all"
              onClick={() => {
                fetchEntities()
                fetchDropdownsFunc()
              }}
              disabled={loading}
            >
              <motion.div
                animate={loading ? { rotate: 360 } : {}}
                transition={{ repeat: loading ? Infinity : 1, duration: 1, ease: 'linear' }}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'text-primary' : 'text-slate-400'}`} />
              </motion.div>
            </Button>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {activeEntity === 'Booking' && (
              <Button
                variant="outline"
                onClick={() => setIsBulkUploadOpen(true)}
                className="w-full md:w-auto rounded-2xl font-black text-xs tracking-widest uppercase h-14 px-8 border-slate-100 bg-white hover:bg-slate-50 active:scale-95 transition-all"
              >
                <ClipboardList className="w-5 h-5 mr-2" /> BULK UPLOAD
              </Button>
            )}
            {!(activeEntity === 'Property' && user?.role !== 'SUPER_ADMIN') && (
              <Button
                onClick={() => {
                  setEditingItem(null)
                  setIsDialogOpen(true)
                }}
                className="w-full md:w-auto flex-1 md:flex-none rounded-2xl font-black text-xs tracking-widest uppercase h-14 px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5 mr-2" /> ADD {activeEntity}
              </Button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400"
                    >
                      {col.split('.').pop()}
                    </th>
                  ))}
                  <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading && entities.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="px-8 py-12 text-center"
                    >
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/20" />
                    </td>
                  </tr>
                ) : entities.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs"
                    >
                      No {activeEntity}s found
                    </td>
                  </tr>
                ) : (
                  entities.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      {columns.map((col) => {
                        const value = col.includes('.')
                          ? col
                            .split('.')
                            .reduce((obj, key) => obj?.[key], item)
                          : item[col]

                        const displayValue = col.toLowerCase().includes('date')
                          ? value
                            ? new Date(value).toLocaleDateString()
                            : '-'
                          : String(value || '-')

                        if (activeEntity === 'Property' && col === 'name') {
                          return (
                            <td
                              key={col}
                              className="px-8 py-5 text-sm font-bold text-slate-700"
                            >
                              <Link
                                href={`/properties/${item.id}`}
                                className="text-primary hover:underline transition-all"
                              >
                                {displayValue}
                              </Link>
                            </td>
                          )
                        }

                        if (activeEntity === 'Room' && col === 'roomNumber') {
                          return (
                            <td
                              key={col}
                              className="px-8 py-5 text-sm font-bold text-slate-700"
                            >
                              <Link
                                href={`/rooms/${item.id}`}
                                className="text-primary hover:underline transition-all"
                              >
                                {displayValue}
                              </Link>
                            </td>
                          )
                        }

                        return (
                          <td
                            key={col}
                            className="px-8 py-5 text-sm font-bold text-slate-700"
                          >
                            {displayValue}
                          </td>
                        )
                      })}
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5"
                            onClick={() => {
                              setEditingItem(item)
                              setIsDialogOpen(true)
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Showing {currentPage * PAGE_SIZE + 1} -{' '}
              {Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} of{' '}
              {totalCount} {activeEntity}s
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="rounded-xl h-10 px-4 font-bold border-slate-100 hover:bg-slate-50"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(currentPage + 1) * PAGE_SIZE >= totalCount}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="rounded-xl h-10 px-4 font-bold border-slate-100 hover:bg-slate-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderFormFields = () => {
    switch (activeEntity) {
      case 'Property':
        return (
          <>
            <div className="space-y-2">
              <Label>Property Name</Label>
              <Input
                name="name"
                required
                placeholder="Luxury Suites"
                defaultValue={editingItem?.name || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                name="address"
                required
                placeholder="123 Beach Road, Puri"
                defaultValue={editingItem?.address || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                name="timezone"
                required
                placeholder="Asia/Kolkata"
                defaultValue={editingItem?.timezone || ''}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax Amount (%)</Label>
                <Input
                  name="taxAmount"
                  type="number"
                  step="0.01"
                  defaultValue={editingItem?.settings?.taxAmount || editingItem?.taxPercentage || '12'}
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <input
                  type="checkbox"
                  name="defaultTaxEnabled"
                  id="defaultTaxEnabled"
                  defaultChecked={editingItem?.settings?.defaultTaxEnabled !== false}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <Label htmlFor="defaultTaxEnabled" className="text-xs font-bold uppercase tracking-tight opacity-70">Enable Tax</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in Time</Label>
                <Input
                  name="checkinTime"
                  type="time"
                  defaultValue={editingItem?.settings?.checkinTime || editingItem?.checkInTime || '12:00'}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-out Time</Label>
                <Input
                  name="checkoutTime"
                  type="time"
                  defaultValue={editingItem?.settings?.checkoutTime || editingItem?.checkOutTime || '11:00'}
                />
              </div>
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
            {existingPhotos.length > 0 && (
              <div className="col-span-full space-y-2">
                <Label>Existing Property Photos</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  {existingPhotos.map((url, index) => (
                    <div key={url} className="relative group aspect-video rounded-xl overflow-hidden border bg-white animate-fade-in">
                      <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setExistingPhotos(prev => prev.filter(item => item !== url))}
                        className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2 col-span-full">
              <Label>Upload Photos</Label>
              <Input
                name="photosFiles"
                type="file"
                accept="image/*"
                multiple
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
              <Input
                name="name"
                required
                placeholder="Deluxe Room"
                defaultValue={editingItem?.name || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input
                name="capacity"
                type="number"
                required
                placeholder="2"
                defaultValue={editingItem?.capacity || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Price</Label>
              <Input
                name="defaultPrice"
                type="number"
                required
                placeholder="2500"
                defaultValue={editingItem?.defaultPrice || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Property</Label>
              <SearchableCombobox
                name="propertyId"
                value={selectedPropertyId || editingItem?.propertyId || ''}
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
            {existingPhotos.length > 0 && (
              <div className="col-span-full space-y-2">
                <Label>Existing Room Type Photos</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  {existingPhotos.map((url, index) => (
                    <div key={url} className="relative group aspect-video rounded-xl overflow-hidden border bg-white animate-fade-in">
                      <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setExistingPhotos(prev => prev.filter(item => item !== url))}
                        className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2 col-span-full">
              <Label>Upload Photos</Label>
              <Input
                name="photosFiles"
                type="file"
                accept="image/*"
                multiple
                className="pt-3"
              />
            </div>
          </>
        )
      case 'Room':
        return (
          <>
            {!editingItem && (
              <div className="space-y-2">
                <Label>Number of Rooms to Create</Label>
                <Input
                  name="numberOfRooms"
                  type="number"
                  min="1"
                  defaultValue="1"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{editingItem ? 'Room Number' : 'Starting Room Number'}</Label>
              <Input
                name="roomNumber"
                required
                placeholder="101"
                defaultValue={editingItem?.roomNumber || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Room Type</Label>
              <SearchableCombobox
                name="roomTypeId"
                value={selectedRoomTypeId || editingItem?.roomTypeId || ''}
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
              <Select
                name="status"
                defaultValue={editingItem?.status || 'AVAILABLE'}
              >
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
                  value={selectedGuestId || editingItem?.guestId || ''}
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
                value={selectedPropertyId || editingItem?.propertyId || ''}
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
                value={selectedRoomId || editingItem?.roomId || ''}
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
              <Input
                name="checkInDate"
                type="datetime-local"
                required
                defaultValue={editingItem?.checkInDate?.split('T')[0] || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Check-Out Date</Label>
              <Input
                name="checkOutDate"
                type="datetime-local"
                required
                defaultValue={editingItem?.checkOutDate?.split('T')[0] || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Adults</Label>
              <Input
                name="adults"
                type="number"
                required
                defaultValue={editingItem?.adults || '1'}
              />
            </div>
            <div className="space-y-2">
              <Label>Children</Label>
              <Input
                name="children"
                type="number"
                required
                defaultValue={editingItem?.children || '0'}
              />
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <input
                type="checkbox"
                name="waiveLastDayCharge"
                id="waiveLastDayCharge"
                defaultChecked={editingItem?.waiveLastDayCharge || false}
                className="w-5 h-5 accent-primary"
              />
              <Label htmlFor="waiveLastDayCharge" className="cursor-pointer">
                Waive Last Day Charge
              </Label>
            </div>
            <div className="space-y-2">
              <Label>Override Rate (Per Night)</Label>
              <Input
                name="overrideRate"
                type="number"
                step="0.01"
                placeholder="Override default room price (Optional)"
                defaultValue={editingItem?.overrideRate || ''}
              />
            </div>
            <div className="space-y-2 col-span-full">
              <Label>Booking Notes</Label>
              <Input
                name="notes"
                placeholder="Special requests, instructions, etc."
                defaultValue={editingItem?.notes || ''}
              />
            </div>
          </>
        )
      case 'Employee':
        return (
          <>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                name="name"
                required
                placeholder="Alex Johnson"
                defaultValue={editingItem?.name || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                name="email"
                type="email"
                required
                placeholder="alex@hotel.com"
                defaultValue={editingItem?.email || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                name="password"
                type="password"
                required={!editingItem}
                minLength={6}
                placeholder={
                  editingItem
                    ? 'Leave blank to keep current'
                    : 'Min 6 characters'
                }
              />
            </div>
            <div className="space-y-2">
              <Label>System Role</Label>
              <Select name="role" defaultValue={editingItem?.role || 'STAFF'}>
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
              <Input
                name="name"
                required
                placeholder="Guest Name"
                defaultValue={editingItem?.name || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                name="phone"
                required
                placeholder="+91 98765 43210"
                defaultValue={editingItem?.phone || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                name="email"
                type="email"
                placeholder="guest@example.com"
                defaultValue={editingItem?.email || ''}
              />
            </div>
            <div className="space-y-2 col-span-full">
              <Label>Address</Label>
              <Input
                name="address"
                placeholder="Full Address"
                defaultValue={editingItem?.address || ''}
              />
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
              <Input
                name="name"
                required
                placeholder="Laundry"
                defaultValue={editingItem?.name || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                name="price"
                type="number"
                step="0.01"
                required
                defaultValue={editingItem?.price || ''}
              />
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
              <Input
                name="date"
                type="date"
                required
                defaultValue={editingItem?.date || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Rooms</Label>
              <Input
                name="totalRooms"
                type="number"
                required
                defaultValue={editingItem?.totalRooms || ''}
              />
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
              <Label>Product Name</Label>
              <Input
                name="name"
                required
                placeholder="Bottled Water"
                defaultValue={editingItem?.name || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                name="price"
                type="number"
                step="0.01"
                required
                defaultValue={editingItem?.price || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                name="category"
                placeholder="Beverage"
                defaultValue={editingItem?.category || ''}
              />
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
                value={selectedBookingId ?? undefined}
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
              <Input
                name="tableNumber"
                placeholder="T-10"
                defaultValue={editingItem?.tableNumber || ''}
              />
            </div>
            <div className="space-y-2 col-span-full">
              <Label>Notes</Label>
              <Input
                name="notes"
                placeholder="Cooking instructions..."
                defaultValue={editingItem?.notes || ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                name="status"
                defaultValue={editingItem?.status || 'PENDING'}
              >
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
                setCurrentPage(0)
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
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="p-10 pb-0 flex justify-between items-start">
          <div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">
              {activeEntity}s
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
              {totalCount} Records Available • Administrative Control
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 pt-8 scrollbar-none">
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto text-red-500"
                  onClick={() => setSuccess(null)}
                >
                  <XCircle />
                </Button>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto text-red-500"
                  onClick={() => setError(null)}
                >
                  <XCircle />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeEntity}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'circOut' }}
            >
              {renderEntityList()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dialog for Add/Edit Form */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-[3rem] border-none shadow-2xl">
            <div className="p-10 md:p-14">
              <DialogHeader className="mb-10">
                <DialogTitle className="text-4xl font-black text-slate-900 tracking-tighter">
                  {editingItem ? 'Edit' : 'Register'} {activeEntity}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleFormSubmit} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                  {renderFormFields()}
                </div>

                <div className="flex justify-end gap-4 pt-10 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsDialogOpen(false)}
                    className="rounded-2xl h-16 px-10 font-black text-xs tracking-widest uppercase text-slate-400"
                  >
                    Discard
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="rounded-3xl h-16 px-14 font-black text-xs tracking-widest uppercase shadow-2xl shadow-primary/30"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : editingItem ? (
                      'Update Record'
                    ) : (
                      `Confirm Registration`
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
        {renderBulkUploadDialog()}
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
