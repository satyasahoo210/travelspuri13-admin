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
import { createClient } from '@/lib/utils/supabase/client'
import { fromZonedTime } from 'date-fns-tz'
import { Loader2, Search, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'

type Guest = Pick<Tables<'Guest'>, 'id' | 'name' | 'phone'>
type Room = Pick<Tables<'Room'>, 'id' | 'roomNumber' | 'roomTypeId'> & {
  RoomType: Pick<Tables<'RoomType'>, 'propertyId'>
}

export function BookingForm({
  onSuccess,
  initialData,
}: {
  onSuccess?: () => void
  initialData?: {
    roomId?: string
    checkIn?: string
    checkOut?: string
  }
}) {
  const supabase = createClient()
  const { user } = useAuth()
  const { currentProperty } = useProperty()

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
    roomId: initialData?.roomId || '',
    checkIn: initialData?.checkIn || '',
    checkOut: initialData?.checkOut || '',
    amount: '0',
    adults: '1',
    children: '0',
    overrideRate: '',
    notes: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!currentProperty?.id) return

      const { data: guestData } = await supabase
        .from('Guest')
        .select('id, name, phone')
        .order('name')
      const { data: roomData } = await supabase
        .from('Room')
        .select('id, roomNumber, roomTypeId, RoomType!inner(propertyId)')
        .eq('RoomType.propertyId', currentProperty.id)
        .eq('status', 'AVAILABLE')

      if (guestData) setGuests(guestData)
      if (roomData) setRooms(roomData)
    }

    fetchData()
  }, [currentProperty?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

      // Timezone parsing
      let checkInDateStr = formData.checkIn
      let checkOutDateStr = formData.checkOut

      if (currentProperty.timezone) {
        const timeZone = currentProperty.timezone
        // Parse the local datetime string into UTC dates considering the property's timezone
        checkInDateStr = fromZonedTime(formData.checkIn, timeZone).toISOString()
        checkOutDateStr = fromZonedTime(
          formData.checkOut,
          timeZone,
        ).toISOString()
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
            totalAmount: parseFloat(formData.amount),
            notes: formData.notes,
            status: 'CONFIRMED',
          },
        ])
        .select()
        .single()

      if (bError) throw bError

      // 2. Create the Relational Room Assignment (BookingRoom)
      const selectedRoom = rooms.find((r) => r.id === formData.roomId)
      if (selectedRoom) {
        const { error: brError } = await supabase.from('BookingRoom').insert([
          {
            bookingId: booking.id,
            roomId: formData.roomId,
            roomTypeId: selectedRoom.roomTypeId,
            priceOverride: formData.overrideRate
              ? parseFloat(formData.overrideRate)
              : null,
            status: 'CONFIRMED',
          },
        ])

        if (brError) throw brError
      }

      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Error creating booking:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-h-[70vh] overflow-y-auto px-1 pb-4 scrollbar-none"
    >
      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
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
            <Label>Guest Name</Label>
            <Input
              required
              value={quickGuest.name}
              onChange={(e) =>
                setQuickGuest({ ...quickGuest, name: e.target.value })
              }
              placeholder="Full Name"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={quickGuest.phone}
              onChange={(e) =>
                setQuickGuest({ ...quickGuest, phone: e.target.value })
              }
              placeholder="+1-xxx-xxx-xxxx"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={quickGuest.email}
              onChange={(e) =>
                setQuickGuest({ ...quickGuest, email: e.target.value })
              }
              placeholder="guest@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={quickGuest.address}
              onChange={(e) =>
                setQuickGuest({ ...quickGuest, address: e.target.value })
              }
              placeholder="Full Address"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ID Proof Type</Label>
              <Select
                value={quickGuest.idProofType}
                onValueChange={(v) =>
                  setQuickGuest({ ...quickGuest, idProofType: v! })
                }
              >
                <SelectTrigger className="bg-white border-slate-200">
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
                value={quickGuest.idProofNumber}
                onChange={(e) =>
                  setQuickGuest({
                    ...quickGuest,
                    idProofNumber: e.target.value,
                  })
                }
                placeholder="Enter Details"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>ID Proof Document (Optional)</Label>
            <Input
              type="file"
              accept="image/*,.pdf"
              className="pt-3 bg-white"
              onChange={(e) =>
                setQuickGuest({
                  ...quickGuest,
                  idProofFile: e.target.files?.[0] || null,
                })
              }
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Select Guest</Label>
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

      <div className="space-y-2">
        <Label>Assign Room</Label>
        <SearchableCombobox
          options={rooms.map((r) => ({
            value: r.id,
            label: `Room ${r.roomNumber}`,
          }))}
          value={formData.roomId}
          onChange={(v) => setFormData({ ...formData, roomId: v })}
          placeholder="Select available room..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Check-in</Label>
          <Input
            type="datetime-local"
            required
            className="h-12 rounded-xl"
            value={formData.checkIn}
            onChange={(e) =>
              setFormData({ ...formData, checkIn: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Check-out</Label>
          <Input
            type="datetime-local"
            required
            className="h-12 rounded-xl"
            value={formData.checkOut}
            onChange={(e) =>
              setFormData({ ...formData, checkOut: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Adults</Label>
          <Input
            type="number"
            required
            className="h-12 rounded-xl"
            value={formData.adults}
            onChange={(e) =>
              setFormData({ ...formData, adults: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Children</Label>
          <Input
            type="number"
            required
            className="h-12 rounded-xl"
            value={formData.children}
            onChange={(e) =>
              setFormData({ ...formData, children: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Override Rate (₹) / Night</Label>
          <Input
            type="number"
            className="h-12 rounded-xl"
            placeholder="Leave empty for default"
            value={formData.overrideRate}
            onChange={(e) =>
              setFormData({ ...formData, overrideRate: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Expected Amount (₹)</Label>
          <Input
            type="number"
            required
            className="h-12 rounded-xl font-bold text-primary"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes (Optional)</Label>
        <Input
          className="h-12 rounded-xl"
          placeholder="Special requests, flight details, etc."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-14 rounded-2xl text-lg font-heading font-black tracking-tighter shadow-xl shadow-primary/20"
      >
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          'CREATE RESERVATION'
        )}
      </Button>
    </form>
  )
}
