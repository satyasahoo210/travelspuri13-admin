'use client'

import { BookingForm } from '@/components/bookings/booking-form'
import { useProperty } from '@/components/providers/property-provider'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NewBookingPage() {
  const router = useRouter()
  const { currentProperty } = useProperty()

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
              onSuccess={() => router.push('/bookings')} 
            />
          </div>
        </main>
      </div>
    </div>
  )
}
