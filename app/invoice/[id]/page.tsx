'use client';

import { useProperty } from '@/components/providers/property-provider';
import { db, Booking, Guest, FolioItem, PropertySetting } from '@/lib/db/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, Download, ArrowLeft, Hotel, MapPin, Phone, Globe, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function InvoicePage() {
  const params = useParams();
  const bookingId = params.id as string;
  const { currentProperty } = useProperty();

  // Load Data
  const booking = useLiveQuery(() => db.bookings.get(bookingId), [bookingId]);
  const guest = useLiveQuery(async () => {
    if (!booking) return undefined;
    const g = await db.guests.get(booking.guestId);
    return g || undefined;
  }, [booking]);
  const folioItems = useLiveQuery(() => db.folioItems.where('bookingId').equals(bookingId).toArray(), [bookingId]);
  const settings = useLiveQuery(async () => {
    if (!currentProperty) return undefined;
    const s = await db.propertySettings.get(currentProperty.id);
    return s || undefined;
  }, [currentProperty]);

  if (!booking || !guest || !folioItems || !settings) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-pulse text-muted-foreground font-medium">Generating Invoice...</div>
    </div>
  );

  const charges = folioItems.filter(f => f.type !== 'PAYMENT' && f.type !== 'TAX');
  const taxes = folioItems.filter(f => f.type === 'TAX');
  const payments = folioItems.filter(f => f.type === 'PAYMENT');

  const subtotal = charges.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = taxes.reduce((sum, item) => sum + item.amount, 0);
  const totalPaid = payments.reduce((sum, item) => sum + item.amount, 0);
  const grandTotal = subtotal + totalTax;
  const balanceDue = grandTotal - totalPaid;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-secondary/20 p-4 md:p-8 print:p-0 print:bg-white">
      {/* Action Bar - Hidden on print */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden">
        <Link href={`/bookings`}>
          <Button variant="ghost" className="gap-2 font-bold text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Booking
          </Button>
        </Link>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 font-bold" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print Invoice
          </Button>
          <Button className="gap-2 font-bold">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden print:shadow-none print:rounded-none" id="invoice-content">
        {/* Header Block */}
        <div className="bg-primary text-primary-foreground p-8 md:p-12 flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Hotel className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight">{currentProperty?.name}</h1>
            </div>
            <div className="space-y-1 text-sm opacity-80">
              <p className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {currentProperty?.id}, Beach Road, Puri, Odisha</p>
              <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> +91 98765 43210</p>
              <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> accounts@{currentProperty?.name.toLowerCase().replace(/\s/g, '')}.com</p>
              <p className="flex items-center gap-2"><Globe className="h-3 w-3" /> www.{currentProperty?.name.toLowerCase().replace(/\s/g, '')}.com</p>
            </div>
          </div>
          <div className="text-right flex flex-col justify-between items-end">
            <div className="space-y-1">
              <h2 className="text-4xl font-black opacity-40">INVOICE</h2>
              <p className="text-sm font-bold opacity-80">#{bookingId.slice(0, 8).toUpperCase()}</p>
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
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Billed To</h4>
            <div className="space-y-1">
              <p className="text-xl font-black">{guest.name}</p>
              {guest.companyName && (
                <div className="mt-2">
                  <p className="font-bold text-primary">{guest.companyName}</p>
                  <p className="text-xs text-muted-foreground font-mono">GSTIN: {guest.gstin}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-2">{guest.phone}</p>
              <p className="text-sm text-muted-foreground">{guest.email}</p>
            </div>
          </div>
          <div className="space-y-4 md:text-right">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground md:justify-end">Stay Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between md:justify-end gap-4 text-sm">
                <span className="text-muted-foreground">Check-in:</span>
                <span className="font-bold">{format(new Date(booking.checkInDate), 'dd MMM yyyy')}</span>
              </div>
              <div className="flex justify-between md:justify-end gap-4 text-sm">
                <span className="text-muted-foreground">Check-out:</span>
                <span className="font-bold">{format(new Date(booking.checkOutDate), 'dd MMM yyyy')}</span>
              </div>
              <div className="flex justify-between md:justify-end gap-4 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="rounded-md h-5 px-1.5 font-bold uppercase text-[9px]">
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
              <tr className="border-b text-muted-foreground">
                <th className="text-left pb-4 font-black uppercase tracking-wider text-[10px]">Description</th>
                <th className="text-right pb-4 font-black uppercase tracking-wider text-[10px]">Quantity</th>
                <th className="text-right pb-4 font-black uppercase tracking-wider text-[10px]">Unit Price</th>
                <th className="text-right pb-4 font-black uppercase tracking-wider text-[10px]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {charges.map((item) => (
                <tr key={item.id}>
                  <td className="py-4">
                    <p className="font-bold text-foreground">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground opacity-70 uppercase tracking-tighter">
                      {item.type.replace('_', ' ')} • {format(new Date(item.updatedAt), 'dd MMM')}
                    </p>
                  </td>
                  <td className="py-4 text-right font-medium">1</td>
                  <td className="py-4 text-right font-medium">{settings.currency} {item.amount.toLocaleString()}</td>
                  <td className="py-4 text-right font-black">{settings.currency} {item.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="mt-12 flex justify-end">
            <div className="w-full md:w-64 space-y-3">
              <div className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground font-medium">Subtotal</span>
                <span className="font-black text-foreground">{settings.currency} {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground font-medium">Tax ({settings.taxRate}%)</span>
                <span className="font-black text-foreground">{settings.currency} {totalTax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-y border-foreground/10">
                <span className="font-black text-lg uppercase tracking-tight">Total</span>
                <span className="text-2xl font-black text-primary">{settings.currency} {grandTotal.toLocaleString()}</span>
              </div>
              {totalPaid > 0 && (
                <div className="flex justify-between text-sm py-1 font-bold text-emerald-600">
                  <span>Amount Paid</span>
                  <span>- {settings.currency} {totalPaid.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-4 bg-secondary/50 rounded-2xl px-4 mt-4">
                <span className="font-black text-xs uppercase tracking-widest text-muted-foreground">Balance Due</span>
                <span className="text-xl font-black text-foreground">{settings.currency} {balanceDue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Terms */}
        <div className="p-8 md:p-12 bg-secondary/20 border-t flex flex-col md:flex-row justify-between gap-8 items-center text-center md:text-left">
          <div className="space-y-1 max-w-xs">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Payment Terms</h5>
            <p className="text-[10px] leading-relaxed text-muted-foreground font-medium">
              Please finalize payment within 24 hours of checkout. Payments can be made via UPI, Card, or Wire Transfer.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full border-2 border-primary/20 flex items-center justify-center font-black text-primary text-xs">
              AG
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Generated By</p>
              <p className="text-xs font-bold text-primary">Antigravity PMS v1.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
