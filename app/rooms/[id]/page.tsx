'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/utils/supabase/client'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  BedDouble,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Construction,
  DoorOpen,
  Eraser,
  Grid,
  Loader2,
  Pencil,
  Save,
  Users,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const statusOptions = [
  { value: 'AVAILABLE', label: 'Available', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', activeBg: 'bg-emerald-500 text-white' },
  { value: 'MAINTENANCE', label: 'Maintenance', icon: Construction, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', activeBg: 'bg-rose-500 text-white' },
]

export default function RoomDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const roomId = params.id as string

  const [room, setRoom] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingPrice, setUpdatingPrice] = useState(false)
  const [editPriceMode, setEditPriceMode] = useState(false)
  const [newPrice, setNewPrice] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)

  const fetchRoomDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchErr } = await supabase
        .from('Room')
        .select('*, RoomType(*, Property(*))')
        .eq('id', roomId)
        .single()

      if (fetchErr) throw fetchErr
      setRoom(data)
      if (data?.RoomType) {
        setNewPrice(data.RoomType.defaultPrice?.toString() || '')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to fetch room details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (roomId) {
      fetchRoomDetails()
    }
  }, [roomId])

  const handleUpdateStatus = async (newStatus: any) => {
    if (!room || room.status === newStatus) return
    setUpdatingStatus(true)
    try {
      const { error: updateErr } = await supabase
        .from('Room')
        .update({ status: newStatus })
        .eq('id', roomId)

      if (updateErr) throw updateErr
      setRoom((prev: any) => ({ ...prev, status: newStatus }))
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to update room status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleUpdateBasePrice = async () => {
    if (!room?.RoomType || !newPrice || isNaN(parseFloat(newPrice))) {
      alert('Please enter a valid price')
      return
    }

    setUpdatingPrice(true)
    try {
      const priceVal = parseFloat(newPrice)
      const { error: updateErr } = await supabase
        .from('RoomType')
        .update({ defaultPrice: priceVal })
        .eq('id', room.RoomType.id)

      if (updateErr) throw updateErr

      setRoom((prev: any) => ({
        ...prev,
        RoomType: {
          ...prev.RoomType,
          defaultPrice: priceVal
        }
      }))
      setEditPriceMode(false)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to update base price')
    } finally {
      setUpdatingPrice(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Fetching Room Details...</p>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen p-8 bg-slate-50 flex flex-col items-center justify-center">
        <Card className="max-w-md w-full bg-white rounded-3xl border-slate-100 shadow-xl p-8 text-center space-y-6">
          <BedDouble className="w-16 h-16 text-rose-500 mx-auto" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Room Not Found</h1>
          <p className="text-slate-500 text-sm font-medium">{error || 'The requested room could not be loaded.'}</p>
          <Button className="w-full h-12 rounded-xl font-bold uppercase text-xs tracking-widest" onClick={() => router.push('/rooms')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Rooms
          </Button>
        </Card>
      </div>
    )
  }

  const roomType = room.RoomType || {}
  const property = roomType.Property || {}
  const photos = roomType.photos || []
  const hasPhotos = photos.length > 0
  const activeStatusConfig = statusOptions.find(opt => opt.value === room.status) || statusOptions[0]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 p-4 md:p-10 selection:bg-primary/20">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">

        {/* Navigation & Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-2xl border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all shrink-0"
              onClick={() => router.push('/rooms')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-heading font-black text-slate-900 tracking-tight leading-none uppercase">Room {room.roomNumber}</h1>
                <Badge className={`font-bold text-[10px] tracking-widest uppercase px-3 py-1 ${activeStatusConfig.bg} ${activeStatusConfig.color} border ${activeStatusConfig.border}`}>
                  {room.status}
                </Badge>
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <Link href={`/properties/${property.id}`} className="hover:text-primary hover:underline transition-all">
                  {property.name}
                </Link>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href={`/properties/${property.id}`}>
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 font-black text-xs tracking-widest uppercase h-12 px-6"
              >
                <Building2 className="w-4 h-4 mr-2" /> Property View
              </Button>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Room Status update block */}
          <div className="lg:col-span-5 space-y-8">
            <Card className="bg-white border-slate-200 rounded-[2.5rem] shadow-sm p-6 md:p-8 space-y-8">
              <div>
                <h2 className="font-heading font-black text-slate-900 uppercase tracking-tight text-xl">Room Status</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Instant state control</p>
              </div>

              <div className="flex flex-col gap-3">
                {statusOptions.map(opt => {
                  const isSelected = room.status === opt.value
                  return (
                    <button
                      key={opt.value}
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus(opt.value)}
                      className={`w-full h-16 rounded-2xl border px-5 flex items-center justify-between text-left font-black transition-all ${isSelected
                          ? `${opt.activeBg} border-transparent shadow-lg scale-[1.01]`
                          : `${opt.bg} ${opt.color} border-current/10 hover:bg-white hover:border-slate-300`
                        }`}
                    >
                      <span className="text-xs uppercase tracking-widest">{opt.label}</span>
                      {updatingStatus && isSelected ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <opt.icon className="w-5 h-5 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Price Edit block */}
            <Card className="bg-white border-slate-200 rounded-[2.5rem] shadow-sm p-6 md:p-8 space-y-6">
              <div>
                <h2 className="font-heading font-black text-slate-900 uppercase tracking-tight text-xl">Category Pricing</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Room Type Base Price</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                {editPriceMode ? (
                  <div className="space-y-4">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block leading-none">Enter New Price</span>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        className="flex-1 h-12 px-3 font-bold border-slate-200 bg-white rounded-xl"
                        value={newPrice}
                        onChange={e => setNewPrice(e.target.value)}
                        placeholder="Price"
                        disabled={updatingPrice}
                      />
                      <Button
                        onClick={handleUpdateBasePrice}
                        disabled={updatingPrice}
                        className="h-12 px-5 rounded-xl font-bold text-xs uppercase"
                      >
                        {updatingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditPriceMode(false)
                          setNewPrice(roomType.defaultPrice?.toString() || '')
                        }}
                        disabled={updatingPrice}
                        className="h-12 w-12 rounded-xl border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block leading-none mb-1">Standard Rate</span>
                      <span className="text-2xl font-heading font-black text-slate-900">₹{roomType.defaultPrice || 0}</span>
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-xl border-slate-200 font-black text-[10px] tracking-widest uppercase px-4 h-10"
                      onClick={() => setEditPriceMode(true)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Price
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Room Category Info & Gallery */}
          <div className="lg:col-span-7 space-y-8">
            <Card className="bg-white border-slate-200 rounded-[2.5rem] shadow-sm p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-black text-slate-900 uppercase tracking-tight text-xl">{roomType.name}</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Category Specifications</p>
                </div>
                <Badge className="bg-slate-100 text-slate-700 font-black text-[10px] tracking-wider uppercase border border-slate-200/50 hover:bg-slate-150 px-3 py-1.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-500" />
                  Max {roomType.capacity} Guests
                </Badge>
              </div>

              {/* Slide */}
              <div className="aspect-video max-h-[360px] rounded-3xl overflow-hidden relative group bg-black border border-slate-200/50">
                {hasPhotos ? (
                  <>
                    <img
                      src={photos[activeImage]}
                      alt={roomType.name}
                      className="w-full h-full object-cover select-none pointer-events-none transition-all duration-700 ease-in-out"
                    />
                    {photos.length > 1 && (
                      <>
                        {/* Left Arrow */}
                        <button
                          onClick={() => setActiveImage(prev => (prev - 1 + photos.length) % photos.length)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-white/95 text-slate-800 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 z-10"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        {/* Right Arrow */}
                        <button
                          onClick={() => setActiveImage(prev => (prev + 1) % photos.length)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-white/95 text-slate-800 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 z-10"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        {/* Indicators */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-10 bg-slate-900/40 p-1.5 rounded-full backdrop-blur-sm">
                          {photos.map((_: any, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => setActiveImage(idx)}
                              className={`h-1.5 rounded-full transition-all duration-300 ${activeImage === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/85'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100/50 p-8 text-center gap-4 text-slate-400">
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200/50">
                      <BedDouble className="w-10 h-10 text-slate-300" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800">No Category Photos</h3>
                      <p className="text-[10px] font-semibold mt-1">Upload room category photos in the Manage section to display them here.</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

        </div>

      </div>
    </div>
  )
}
