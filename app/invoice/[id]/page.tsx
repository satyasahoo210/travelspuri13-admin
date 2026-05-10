'use client';

import { useProperty } from '@/components/providers/property-provider';
import { createClient } from '@/lib/utils/supabase/client';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, Download, ArrowLeft, Hotel, MapPin, Phone, Globe, Mail, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function InvoicePage() {
  const params = useParams();
  const bookingId = params.id as string;
  const { currentProperty } = useProperty();
  const supabase = createClient();

  const [data, setData] = useState<{
    booking: any;
    billing: any;
    roomCharges: any[];
    serviceCharges: any[];
    payments: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoiceData = async () => {
    if (!bookingId) return;
    setLoading(true);

    const [bookingRes, billingRes, roomsRes, servicesRes, paymentsRes] = await Promise.all([
      supabase.from('Booking').select('*, Guest(*), Property(*)').eq('id', bookingId).single(),
      supabase.from('Billing').select('*').eq('bookingId', bookingId).single(),
      supabase.from('BookingRoom').select('*, RoomType(*)').eq('bookingId', bookingId),
      supabase.from('BookingService').select('*, Service(*)').eq('bookingId', bookingId),
      supabase.from('Payment').select('*').eq('bookingId', bookingId)
    ]);

    setData({
      booking: bookingRes.data,
      billing: billingRes.data,
      roomCharges: roomsRes.data || [],
      serviceCharges: servicesRes.data || [],
      payments: paymentsRes.data || []
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoiceData();
  }, [bookingId]);

  if (loading || !data || !data.booking) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
      <div className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Generating Invoice...</div>
    </div>
  );

  const { booking, billing, roomCharges, serviceCharges, payments } = data;
  const guest = booking.Guest;
  const property = booking.Property;
  const settings = property.settings || {};

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const grandTotal = Number(billing?.totalAmount || booking.totalAmount || 0);
  const taxAmount = Number(billing?.taxAmount || 0);
  const subtotal = grandTotal - taxAmount;
  const balanceDue = grandTotal - totalPaid;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-secondary/20 p-4 md:p-8 print:p-0 print:bg-white">
      {/* Action Bar - Hidden on print */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden">
        <Link href={`/bookings`}>
          <Button variant="ghost" className="gap-2 font-bold text-muted-foreground hover:bg-white/50 rounded-xl">
            <ArrowLeft className="h-4 w-4" /> Back to Booking
          </Button>
        </Link>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 font-bold rounded-xl bg-white" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print Invoice
          </Button>
          <Button className="gap-2 font-bold rounded-xl shadow-lg">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-[2.5rem] overflow-hidden print:shadow-none print:rounded-none" id="invoice-content">
        {/* Header Block */}
        <div className="bg-slate-900 text-white p-8 md:p-12 flex flex-col md:flex-row justify-between gap-8 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                <Hotel className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight">{property?.name}</h1>
            </div>
            <div className="space-y-1 text-sm opacity-70 font-medium">
              <p className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {property?.address || 'Puri, Odisha'}</p>
              <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {settings?.phone || '+91 98765 43210'}</p>
              <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> {settings?.email || `info@${property?.name.toLowerCase().replace(/\s/g, '')}.com`}</p>
              <p className="flex items-center gap-2"><Globe className="h-3 w-3" /> {settings?.website || `www.${property?.name.toLowerCase().replace(/\s/g, '')}.com`}</p>
            </div>
          </div>
          <div className="text-right flex flex-col justify-between items-end relative z-10">
            <div className="space-y-1">
              <h2 className="text-5xl font-black text-white/20">INVOICE</h2>
              <p className="text-sm font-black tracking-widest text-primary">#{bookingId.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="space-y-1 mt-4 md:mt-0">
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-right">Date of Issue</p>
              <p className="text-lg font-black">{format(new Date(), 'dd MMMM yyyy')}</p>
            </div>
          </div>
        </div>

        {/* Client & Stay Info */}
        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12 border-b">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Billed To</h4>
            <div className="space-y-1">
              <p className="text-2xl font-black text-slate-900">{guest?.name}</p>
              {guest?.companyName && (
                <div className="mt-2 p-3 bg-secondary/30 rounded-xl inline-block border border-gray-100">
                  <p className="font-bold text-primary text-sm">{guest.companyName}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">GSTIN: {guest.gstin}</p>
                </div>
              )}
              <div className="pt-2">
                <p className="text-sm text-muted-foreground font-medium">{guest?.phone}</p>
                <p className="text-sm text-muted-foreground font-medium">{guest?.email}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 md:text-right">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 md:justify-end">Stay Details</h4>
            <div className="space-y-3">
              <div className="flex justify-between md:justify-end gap-6 text-sm">
                <span className="text-muted-foreground font-medium">Check-in</span>
                <span className="font-black text-slate-900">{format(new Date(booking.checkInDate), 'dd MMM yyyy')}</span>
              </div>
              <div className="flex justify-between md:justify-end gap-6 text-sm">
                <span className="text-muted-foreground font-medium">Check-out</span>
                <span className="font-black text-slate-900">{format(new Date(booking.checkOutDate), 'dd MMM yyyy')}</span>
              </div>
              <div className="flex justify-between md:justify-end gap-6 text-sm pt-2">
                <span className="text-muted-foreground font-medium">Status</span>
                <Badge className="rounded-lg h-6 px-3 font-black uppercase text-[9px] bg-slate-900">
                  {booking.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="p-8 md:p-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b-2 border-slate-100">
                <th className="text-left pb-6 font-black uppercase tracking-widest text-[10px]">Item Description</th>
                <th className="text-right pb-6 font-black uppercase tracking-widest text-[10px]">Qty</th>
                <th className="text-right pb-6 font-black uppercase tracking-widest text-[10px]">Price</th>
                <th className="text-right pb-6 font-black uppercase tracking-widest text-[10px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {roomCharges.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/50">
                  <td className="py-6">
                    <p className="font-black text-slate-900 text-base">{item.RoomType?.name || 'Room Stay'}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight mt-0.5">
                      Accommodation • Base Rate ₹{Number(item.RoomType?.defaultPrice || 0).toLocaleString()}
                    </p>
                  </td>
                  <td className="py-6 text-right font-black text-slate-600">{item.quantity || 1}</td>
                  <td className="py-6 text-right font-black text-slate-600">₹{Number(item.priceOverride || item.RoomType?.defaultPrice || 0).toLocaleString()}</td>
                  <td className="py-6 text-right font-black text-slate-900">₹{Number((item.priceOverride || item.RoomType?.defaultPrice || 0) * (item.quantity || 1)).toLocaleString()}</td>
                </tr>
              ))}
              {serviceCharges.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/50">
                  <td className="py-6">
                    <p className="font-black text-slate-900 text-base">{item.Service?.name || 'Service Charge'}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight mt-0.5">
                      Service / Amenities
                    </p>
                  </td>
                  <td className="py-6 text-right font-black text-slate-600">{item.quantity || 1}</td>
                  <td className="py-6 text-right font-black text-slate-600">₹{Number(item.Service?.price || 0).toLocaleString()}</td>
                  <td className="py-6 text-right font-black text-slate-900">₹{Number(item.totalPrice || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="mt-12 flex justify-end">
            <div className="w-full md:w-80 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
                <span className="font-black text-slate-900">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Tax / GST</span>
                <span className="font-black text-slate-900">₹{taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-6 border-y-2 border-slate-100">
                <span className="font-black text-xl uppercase tracking-tighter text-slate-900">Grand Total</span>
                <span className="text-3xl font-black text-primary">₹{grandTotal.toLocaleString()}</span>
              </div>
              {totalPaid > 0 && (
                <div className="flex justify-between text-xs py-1 font-black text-emerald-600 uppercase tracking-widest">
                  <span>Payments Received</span>
                  <span>- ₹{totalPaid.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-5 bg-slate-900 text-white rounded-3xl px-6 mt-6 shadow-xl shadow-slate-900/20">
                <span className="font-black text-[10px] uppercase tracking-[0.2em] opacity-60">Balance Due</span>
                <span className="text-2xl font-black">₹{balanceDue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Terms */}
        <div className="p-12 bg-slate-50 flex flex-col md:flex-row justify-between gap-12 items-center text-center md:text-left">
          <div className="space-y-2 max-w-sm">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Payment Policy</h5>
            <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
              This is a computer-generated invoice. No signature required. Please verify all items before checkout. For billing disputes, contact support@travelspuri13.com within 7 days.
            </p>
          </div>
          <div className="flex items-center gap-6 p-6 bg-white rounded-[2rem] shadow-sm border border-slate-100">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center font-black text-white text-xl shadow-lg shadow-primary/20 rotate-3">
              13
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Official Partner</p>
              <p className="text-sm font-black text-slate-900">Travels Puri 13</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
