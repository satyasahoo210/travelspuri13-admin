'use client'

import { BookingForm } from '@/components/bookings/booking-form'
import { useProperty } from '@/components/providers/property-provider'
import { Button } from '@/components/ui/button'
import { parse } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NewBookingPage() {
  const formatString = "HH:mm:ss";

  const router = useRouter()
  const { currentProperty } = useProperty()

  const getDefaultCheckInTime = () => {
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
    return formatInTimeZone(parse(propCheckInTime, formatString, new Date()), currentProperty?.timezone ?? 'Asia/Kolkata', `yyyy-MM-dd'T'HH:mm`);
  }

  const getDefaultCheckOutTime = () => {
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
    return formatInTimeZone(parse(propCheckOutTime, formatString, new Date()), currentProperty?.timezone ?? 'Asia/Kolkata', `yyyy-MM-dd'T'HH:mm`);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center gap-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/bookings')}
            className="rounded-2xl w-14 h-14 border-slate-200 bg-white shadow-sm hover:scale-105 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tighter text-slate-900 leading-none mb-1">
              New Booking
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
              Reservations Registry • {currentProperty?.name || 'All Properties'}
            </p>
          </div>
        </header>

        <main className="bg-white rounded-lg shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8">
            <BookingForm
              onSuccess={(id: string) => router.push(`/bookings/${id}`)}
              initialData={{
                checkIn: getDefaultCheckInTime(),
                checkOut: getDefaultCheckOutTime()
              }}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
