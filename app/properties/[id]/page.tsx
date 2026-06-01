'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tables } from '@/database.types'
import { createClient } from '@/lib/utils/supabase/client'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Construction,
  DoorOpen,
  Eraser,
  Globe,
  Loader2,
  MapPin,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Save,
  Users,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Property = Omit<Tables<'Property'>, 'settings'> & {
  settings: {
    defaultTaxEnabled?: boolean
    taxAmount?: number
    checkinTime?: string
    checkoutTime?: string
  }
}
type RoomType = Tables<'RoomType'>
type Room = Tables<'Room'> & { RoomType: Pick<RoomType, 'name'> }

const statusIcons = {
  AVAILABLE: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  OCCUPIED: { icon: DoorOpen, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/10' },
  DIRTY: { icon: Eraser, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
  MAINTENANCE: { icon: Construction, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
}

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const propertyId = params.id as string

  const [property, setProperty] = useState<Property | null>(null)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingPriceId, setUpdatingPriceId] = useState<string | null>(null)
  const [newPrice, setNewPrice] = useState('')
  const [activeImage, setActiveImage] = useState(0)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch Property details
      const { data: propData, error: propErr } = await supabase
        .from('Property')
        .select('*')
        .eq('id', propertyId)
        .single()

      if (propErr) throw propErr
      setProperty(propData as Property)

      // Fetch Room Types
      const { data: rtData, error: rtErr } = await supabase
        .from('RoomType')
        .select('*')
        .eq('propertyId', propertyId)
        .order('name')

      if (rtErr) throw rtErr
      setRoomTypes(rtData || [])

      // Fetch Rooms
      const { data: rData, error: rErr } = await supabase
        .from('Room')
        .select('*, RoomType(name)')
        .eq('RoomType.propertyId', propertyId)

      if (rErr) throw rErr
      setRooms(rData || [])

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to fetch property details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (propertyId) {
      fetchData()
    }
  }, [propertyId])

  const handleUpdateBasePrice = async (rtId: string) => {
    if (!newPrice || isNaN(parseFloat(newPrice))) {
      alert('Please enter a valid price')
      return
    }

    try {
      const priceVal = parseFloat(newPrice)
      const { error: updateErr } = await supabase
        .from('RoomType')
        .update({ defaultPrice: priceVal })
        .eq('id', rtId)

      if (updateErr) throw updateErr

      // Update state locally
      setRoomTypes(prev =>
        prev.map(rt => (rt.id === rtId ? { ...rt, defaultPrice: priceVal } : rt))
      )
      setUpdatingPriceId(null)
      setNewPrice('')
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to update base price')
    }
  }

  // Calculate statistics
  const totalRooms = rooms.length
  const statusCounts = rooms.reduce(
    (acc, r) => {
      const status = r.status || 'AVAILABLE'
      acc[status] = (acc[status] || 0) + 1
      return acc
    },
    { AVAILABLE: 0, OCCUPIED: 0, DIRTY: 0, MAINTENANCE: 0 } as Record<string, number>
  )

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Property Details...</p>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen p-8 bg-slate-50 flex flex-col items-center justify-center">
        <Card className="max-w-md w-full bg-white rounded-3xl border-slate-100 shadow-xl p-8 text-center space-y-6">
          <Building2 className="w-16 h-16 text-rose-500 mx-auto" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Property Not Found</h1>
          <p className="text-slate-500 text-sm font-medium">{error || 'The requested property could not be loaded.'}</p>
          <Button className="w-full h-12 rounded-xl font-bold uppercase text-xs tracking-widest" onClick={() => router.push('/manage')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Manage
          </Button>
        </Card>
      </div>
    )
  }

  const photos = property.photos || []
  const hasPhotos = photos.length > 0

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 p-4 md:p-10 selection:bg-primary/20">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

        {/* Navigation & Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-2xl border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all shrink-0"
              onClick={() => router.push('/manage')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                {property.logoUrl ? (
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={property.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                )}
                <h1 className="text-3xl font-heading font-black text-slate-900 tracking-tight leading-none uppercase">{property.name}</h1>
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {property.address}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-xl border-slate-200 font-black text-xs tracking-widest uppercase h-12 px-6 shrink-0"
            onClick={fetchData}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Sync Data
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Info Columns */}
          <div className="lg:col-span-8 space-y-8">

            {/* Gallery Slide */}
            <Card className="bg-white border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm aspect-video max-h-[480px] relative group bg-black">
              {hasPhotos ? (
                <>
                  <img
                    src={photos[activeImage]}
                    alt={property.name}
                    className="w-full h-full object-cover select-none pointer-events-none transition-all duration-700 ease-in-out"
                  />
                  {photos.length > 1 && (
                    <>
                      {/* Left Arrow */}
                      <button
                        onClick={() => setActiveImage(prev => (prev - 1 + photos.length) % photos.length)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-2xl bg-white/95 text-slate-800 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 z-10"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      {/* Right Arrow */}
                      <button
                        onClick={() => setActiveImage(prev => (prev + 1) % photos.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-2xl bg-white/95 text-slate-800 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 z-10"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      {/* Indicators */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-slate-900/40 p-2 rounded-full backdrop-blur-sm">
                        {photos.map((_: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImage(idx)}
                            className={`h-2 rounded-full transition-all duration-300 ${activeImage === idx ? 'w-6 bg-white' : 'w-2 bg-white/55 hover:bg-white/85'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100/50 p-8 text-center gap-4 text-slate-400">
                  <div className="p-4 bg-white rounded-3xl shadow-sm border border-slate-200/50">
                    <Building2 className="w-12 h-12 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800">No Gallery Photos</h3>
                    <p className="text-xs font-semibold mt-1">Upload property photos in the Manage section to display them here.</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Room Categories (Room Types) */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h2 className="font-heading font-black text-lg uppercase tracking-wider text-slate-700">Room Categories ({roomTypes.length})</h2>
              </div>

              {roomTypes.length === 0 ? (
                <Card className="bg-white border-slate-200 rounded-3xl p-10 text-center">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No Room Categories Defined</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {roomTypes.map(rt => (
                    <Card key={rt.id} className="bg-white border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
                      {/* RoomType Image */}
                      <div className="h-44 bg-slate-100 relative">
                        {rt.photos && rt.photos.length > 0 ? (
                          <img src={rt.photos[0]} alt={rt.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 gap-2">
                            <DoorOpen className="w-8 h-8 text-slate-300" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Photos</span>
                          </div>
                        )}
                        <Badge className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-800 font-black text-[10px] tracking-wider uppercase border border-slate-200/50 hover:bg-white flex items-center gap-1.5 px-3 py-1">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          Up to {rt.capacity} guests
                        </Badge>
                      </div>

                      {/* Content */}
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <h3 className="font-heading font-black text-lg text-slate-900 uppercase tracking-tight leading-tight">{rt.name}</h3>
                        </div>

                        {/* Base Price Editor */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Base Rate / Night</span>
                            {updatingPriceId === rt.id ? (
                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  type="number"
                                  className="w-28 h-10 px-3 font-bold border-slate-200 bg-slate-50 rounded-xl"
                                  value={newPrice}
                                  onChange={e => setNewPrice(e.target.value)}
                                  placeholder="Price"
                                  autoFocus
                                />
                                <Button
                                  size="icon"
                                  onClick={() => handleUpdateBasePrice(rt.id)}
                                  className="h-10 w-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shrink-0 active:scale-95 transition-all"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    setUpdatingPriceId(null)
                                    setNewPrice('')
                                  }}
                                  className="h-10 w-10 rounded-xl border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 shrink-0 active:scale-95 transition-all"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xl font-heading font-black text-slate-900">₹{rt.defaultPrice || 0}</span>
                                <button
                                  onClick={() => {
                                    setUpdatingPriceId(rt.id)
                                    setNewPrice(rt.defaultPrice?.toString() || '')
                                  }}
                                  className="p-1 text-slate-400 hover:text-primary transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Settings & Rooms */}
          <div className="lg:col-span-4 space-y-8">

            {/* Quick Rules & Settings */}
            <Card className="bg-white border-slate-200 rounded-[2rem] shadow-sm p-6 space-y-6">
              <div>
                <h3 className="font-heading font-black text-slate-900 uppercase tracking-tight text-lg">Property Settings</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Operational Parameters</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block leading-none mb-0.5">Check-In</span>
                      <span className="text-sm font-bold text-slate-700">{property.settings?.checkinTime ?? property.checkInTime ?? '08:00 AM'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block leading-none mb-0.5">Check-Out</span>
                      <span className="text-sm font-bold text-slate-700">{property.settings?.checkoutTime ?? property.checkOutTime ?? '07:00 AM'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Percent className="w-5 h-5 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block leading-none mb-0.5">Tax Details</span>
                      <span className="text-sm font-bold text-slate-700">
                        {property.settings?.defaultTaxEnabled !== false
                          ? `${property.settings?.taxAmount || 12}% GST Enabled`
                          : 'Tax Waived/Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block leading-none mb-0.5">Timezone</span>
                      <span className="text-sm font-bold text-slate-700">{property.timezone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Room Status Summary */}
            <Card className="bg-white border-slate-200 rounded-[2rem] shadow-sm p-6 space-y-6">
              <div>
                <h3 className="font-heading font-black text-slate-900 uppercase tracking-tight text-lg">Room Metrics</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Real-time status breakdown</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-3xl font-heading font-black text-slate-800">{totalRooms}</span>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mt-1">Total Rooms</span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center">
                  <span className="text-3xl font-heading font-black text-emerald-600">{statusCounts.AVAILABLE}</span>
                  <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider block mt-1">Available</span>
                </div>
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center">
                  <span className="text-3xl font-heading font-black text-primary">{statusCounts.OCCUPIED}</span>
                  <span className="text-[9px] font-black uppercase text-primary tracking-wider block mt-1">Occupied</span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-center">
                  <span className="text-3xl font-heading font-black text-amber-600">{statusCounts.DIRTY}</span>
                  <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider block mt-1">Dirty</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Room List grid */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h2 className="font-heading font-black text-lg uppercase tracking-wider text-slate-700">Room Roster ({rooms.length})</h2>
          </div>

          {rooms.length === 0 ? (
            <Card className="bg-white border-slate-200 rounded-3xl p-10 text-center">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No Rooms Assigned to this Property</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {rooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' })).map(room => {
                const config = statusIcons[room.status as keyof typeof statusIcons] || statusIcons.AVAILABLE
                return (
                  <Link key={room.id} href={`/rooms/${room.id}`}>
                    <Card className={`h-full min-h-[110px] cursor-pointer group hover:scale-[1.03] transition-all overflow-hidden border border-slate-200/50 shadow-sm hover:shadow-md ${config.bg} p-4 flex flex-col justify-between`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-black text-slate-800 tracking-tight leading-none">{room.roomNumber}</span>
                        <config.icon className={`h-4.5 w-4.5 ${config.color}`} />
                      </div>
                      <div>
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block truncate opacity-80 leading-none mb-1.5">{room.RoomType?.name}</span>
                        <Badge className={`font-bold text-[8px] tracking-widest uppercase px-2 py-0.5 ${config.bg} ${config.color} border border-current/10`}>
                          {room.status}
                        </Badge>
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
