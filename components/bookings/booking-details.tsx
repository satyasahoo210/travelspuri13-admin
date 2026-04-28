'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateInvoicePDF } from "@/lib/finance/invoice-pdf";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/utils/supabase/client";
import { format } from "date-fns";
import {
  ArrowRight,
  BedDouble,
  CreditCard,
  FileText,
  Plus,
  Receipt,
  Trash2
} from "lucide-react";
import { useEffect, useState } from "react";

interface BookingDetailsProps {
  booking: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

type Assignment = Tables<'BookingRoom'> & {
  Room: Tables<'Room'> | null
  RoomType: Tables<'RoomType'> | null
}

export function BookingDetails({ booking: leadBooking, open, onOpenChange, onRefresh }: BookingDetailsProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  const [folio, setFolio] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [property, setProperty] = useState<any>(null);

  const fetchFolioData = async () => {
    if (!leadBooking?.id) return;
    setLoading(true);

    try {
      const [folioRes, assignmentsRes, servicesRes, allServicesRes, allRoomsRes, propRes, payRes] = await Promise.all([
        supabase.from('Booking').select('*, Guest(*)').eq('id', leadBooking.id).single(),
        supabase.from('BookingRoom').select('*, Room(*), RoomType(*)').eq('bookingId', leadBooking.id),
        supabase.from('BookingService').select('*, Service(*)').eq('bookingId', leadBooking.id),
        supabase.from('Service').select('*').eq('propertyId', leadBooking.propertyId),
        supabase.from('Room').select('*, RoomType(*)').eq('RoomType.propertyId', leadBooking.propertyId).eq('status', 'AVAILABLE'),
        supabase.from('Property').select('*').eq('id', leadBooking.propertyId).single(),
        supabase.from('Payment').select('*').eq('bookingId', leadBooking.id).order('createdAt', { ascending: true })
      ]);

      if (folioRes.data) setFolio(folioRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
      if (allServicesRes.data) setAvailableServices(allServicesRes.data);
      if (allRoomsRes.data) setAvailableRooms(allRoomsRes.data);
      if (propRes.data) setProperty(propRes.data);
      if (payRes.data) setPayments(payRes.data);
    } catch (err) {
      console.error("Error fetching folio:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!folio || !property) return;
    generateInvoicePDF(folio, assignments, services, property, payments);

    const roomSubtotal = assignments.reduce((sum, a) => sum + (Number(a.priceOverride) || Number(a.RoomType?.defaultPrice) || 0), 0);
    const serviceSubtotal = services.reduce((sum, s) => sum + Number(s.totalPrice), 0);
    const subtotal = roomSubtotal + serviceSubtotal;
    const discount = folio.discountType === 'PERCENTAGE' 
      ? subtotal * (Number(folio.discountAmount) / 100)
      : Number(folio.discountAmount || 0);
    const taxAmount = (subtotal - discount) * (property.taxPercentage / 100);
    const finalTotal = subtotal - discount + taxAmount;

    await supabase.from('Billing').upsert({
      bookingId: folio.id,
      tenantId: folio.tenantId,
      totalAmount: finalTotal,
      taxAmount: taxAmount,
      paymentStatus: 'PENDING',
      currency: 'INR'
    });

    if (onRefresh) onRefresh();
  };

  useEffect(() => {
    if (open && leadBooking?.id) fetchFolioData();
  }, [open, leadBooking?.id]);

  const updateFolioField = async (field: string, value: any) => {
    if (!folio) return;
    const { error } = await supabase.from('Booking').update({ [field]: value } as TablesInsert<'Booking'>).eq('id', folio.id);
    if (!error) setFolio({ ...folio, [field]: value });
  };

  const handleAddService = async (serviceId: string) => {
    const service = availableServices.find(s => s.id === serviceId);
    if (!service || !folio) return;

    // Check if service already exists in ledger
    const existing = services.find(s => s.serviceId === serviceId);
    if (existing) {
      updateServiceQuantity(existing.id, existing.quantity + 1);
      return;
    }

    const { data, error } = await supabase.from('BookingService').insert([{
      bookingId: folio.id,
      serviceId: service.id,
      quantity: 1,
      totalPrice: service.price
    }]).select('*, Service(*)').single();

    if (!error && data) setServices([...services, data]);
  };

  const updateServiceQuantity = async (id: string, newQty: number) => {
    if (newQty < 1) return;
    const serviceItem = services.find(s => s.id === id);
    if (!serviceItem) return;

    const newTotal = Number(serviceItem.Service?.price || 0) * newQty;
    const { error } = await supabase.from('BookingService').update({ 
      quantity: newQty,
      totalPrice: newTotal
    }).eq('id', id);

    if (!error) {
      setServices(services.map(s => s.id === id ? { ...s, quantity: newQty, totalPrice: newTotal } : s));
    }
  };

  const handleAddRoom = async (roomId: string) => {
    const room = availableRooms.find(r => r.id === roomId);
    if (!room || !folio) return;

    const { data, error } = await supabase.from('BookingRoom').insert([{
      bookingId: folio.id,
      roomId: room.id,
      roomTypeId: room.roomTypeId,
      status: 'CONFIRMED'
    }]).select('*, Room(*), RoomType(*)').single();

    if (!error && data) setAssignments([...assignments, data]);
  };

  const roomSubtotal = assignments.reduce((sum, a) => sum + (Number(a.priceOverride) || Number(a.RoomType?.defaultPrice) || 0), 0);
  const serviceSubtotal = services.reduce((sum, s) => sum + Number(s.totalPrice), 0);
  const discount = folio?.discountType === 'PERCENTAGE' 
    ? (roomSubtotal + serviceSubtotal) * (Number(folio?.discountAmount) / 100)
    : Number(folio?.discountAmount || 0);

  const total = roomSubtotal + serviceSubtotal - discount;

  if (!folio) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl bg-white border-l p-0 flex flex-col h-full shadow-2xl overflow-hidden">
        <Tabs defaultValue="details" className="flex flex-col h-full w-full" onValueChange={setActiveTab}>
          {/* Header Section */}
          <div className="bg-slate-50 p-8 border-b border-slate-100 shrink-0">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <Badge className={cn(
                  "font-black text-[9px] uppercase tracking-widest border-none px-3 py-1",
                  folio.status === 'CONFIRMED' ? "bg-emerald-50 text-emerald-600" : "bg-primary/5 text-primary"
                )}>
                  {folio.status}
                </Badge>
                <h2 className="text-4xl font-heading font-black tracking-tighter text-slate-900 leading-none">
                  {folio.Guest?.name}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Folio ID: {folio.id.slice(0, 8)} • {folio.source}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Balance Due</p>
                <p className="text-3xl font-heading font-black tracking-tighter text-primary">₹{total.toLocaleString()}</p>
              </div>
            </div>

            <TabsList className="grid w-full grid-cols-2 bg-slate-200/50 p-1 rounded-xl h-12">
              <TabsTrigger value="details" className="rounded-lg font-black text-[10px] uppercase tracking-widest">Reservation Details</TabsTrigger>
              <TabsTrigger value="folio" className="rounded-lg font-black text-[10px] uppercase tracking-widest">Folio Ledger</TabsTrigger>
            </TabsList>
          </div>

          {/* Scrollable Content Section */}
          <div className="flex-1 overflow-y-auto p-8 scrollbar-none">
            <TabsContent value="details" className="mt-0 space-y-10 focus-visible:outline-none">
              {/* PAX & Metadata */}
              <section className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-400 font-black text-[10px] uppercase tracking-widest ml-1">Adults</Label>
                  <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => updateFolioField('adults', Math.max(1, (folio.adults || 1) - 1))}>-</Button>
                    <span className="flex-1 text-center font-bold text-lg">{folio.adults || 1}</span>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => updateFolioField('adults', (folio.adults || 1) + 1)}>+</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 font-black text-[10px] uppercase tracking-widest ml-1">Children</Label>
                  <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => updateFolioField('children', Math.max(0, (folio.children || 0) - 1))}>-</Button>
                    <span className="flex-1 text-center font-bold text-lg">{folio.children || 0}</span>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => updateFolioField('children', (folio.children || 0) + 1)}>+</Button>
                  </div>
                </div>
              </section>

              {/* Room Assignments */}
              <section className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <BedDouble className="w-3 h-3" /> Room Assignments
                  </h4>
                  <SelectRoom onAdd={handleAddRoom} rooms={availableRooms} existingIds={assignments.map(a => a.roomId!)} />
                </div>
                <div className="space-y-3">
                  {assignments.map((a) => (
                    <Card key={a.id} className="border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:border-primary/20 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center font-black text-primary border border-slate-100">
                            {a.Room?.roomNumber || '??'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">Standard Room</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{a.status}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nightly Rate</p>
                          <PriceOverrideInput initialValue={a.priceOverride || a.RoomType?.defaultPrice || 0} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Stay Timeline */}
              <section className="p-6 bg-slate-900 rounded-[2rem] text-white flex items-center justify-between shadow-xl shadow-slate-900/10">
                 <div className="text-center flex-1">
                   <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2">Check In</span>
                   <p className="text-xl font-heading font-black tracking-tighter">{format(new Date(folio.checkInDate), 'dd MMM yyyy')}</p>
                 </div>
                 <div className="px-6 opacity-20"><ArrowRight className="w-6 h-6" /></div>
                 <div className="text-center flex-1">
                   <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] block mb-2">Check Out</span>
                   <p className="text-xl font-heading font-black tracking-tighter">{format(new Date(folio.checkOutDate), 'dd MMM yyyy')}</p>
                 </div>
              </section>

              {/* Notes Section */}
              <section className="space-y-3">
                <Label className="text-slate-400 font-black text-[10px] uppercase tracking-widest ml-1 flex items-center gap-2">
                  <FileText className="w-3 h-3" /> Folio Notes
                </Label>
                <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl text-xs font-bold text-amber-900/60 leading-relaxed italic">
                  {folio.notes || "No internal notes recorded for this reservation."}
                </div>
              </section>
            </TabsContent>

            <TabsContent value="folio" className="mt-0 space-y-8 focus-visible:outline-none">
               {/* Ledger details here */}
               <section className="space-y-4">
                  <div className="flex items-center justify-between ml-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Receipt className="w-3 h-3" /> Digital Ledger
                    </h4>
                    <SelectService onAdd={handleAddService} services={availableServices} existingIds={services.map(s => s.serviceId)} />
                  </div>
                  <div className="space-y-2">
                    {assignments.map(a => (
                      <div key={a.id} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group">
                        <div className="flex gap-4 items-center">
                          <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                            <BedDouble className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm">Room {a.Room?.roomNumber} Stay</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Base Rate</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900">₹{(Number(a.priceOverride) || Number(a.RoomType?.defaultPrice) || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                    {services.map(s => (
                      <div key={s.id} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
                        <div className="flex gap-4 items-center">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                            <Plus className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm">{s.Service?.name}</p>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" className="h-4 w-4 bg-slate-100 rounded-sm" onClick={() => updateServiceQuantity(s.id, s.quantity - 1)}>-</Button>
                              <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">{s.quantity}</p>
                              <Button variant="ghost" size="icon" className="h-4 w-4 bg-slate-100 rounded-sm" onClick={() => updateServiceQuantity(s.id, s.quantity + 1)}>+</Button>
                            </div>
                          </div>
                        </div>
                        <p className="font-black text-slate-900">₹{Number(s.totalPrice).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
               </section>

               <Card className="border-none bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-900/20">
                  <CardContent className="p-8 space-y-4">
                     <SummaryRow label="Stay Subtotal" value={roomSubtotal} />
                     <SummaryRow label="Services & F&B" value={serviceSubtotal} />
                     <SummaryRow label="Discount" value={-discount} className="text-emerald-400" />
                     <div className="pt-6 mt-4 border-t border-white/10 flex justify-between items-center">
                       <span className="text-4xl font-heading font-black tracking-tighter text-white">₹{total.toLocaleString()}</span>
                     </div>
                  </CardContent>
               </Card>
            </TabsContent>
          </div>

          {/* Footer Actions */}
          <div className="p-8 border-t border-slate-100 bg-white grid grid-cols-2 gap-4 shrink-0">
            <Button 
              variant="outline" 
              onClick={handleGenerateInvoice}
              className="h-16 rounded-2xl border-slate-200 font-heading font-black tracking-tighter text-lg hover:bg-slate-50 transition-all"
            >
              <Receipt className="mr-3 h-6 w-6 text-slate-400" />
              PDF INVOICE
            </Button>
            <Button className="h-16 rounded-2xl bg-primary shadow-xl shadow-primary/20 font-heading font-black tracking-tighter text-lg hover:scale-[1.01] transition-all">
              <CreditCard className="mr-3 h-6 w-6 text-white" />
              SETTLE FULL
            </Button>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function SummaryRow({ label, value, className = "" }: { label: string, value: number, className?: string }) {
  return (
    <div className={cn("flex justify-between items-center text-sm font-bold text-white/70", className)}>
      <span>{label}</span>
      <span>{value < 0 ? `- ₹${Math.abs(value).toLocaleString()}` : `₹${value.toLocaleString()}`}</span>
    </div>
  );
}

function PriceOverrideInput({ initialValue }: { initialValue: number }) {
  const [val, setVal] = useState(initialValue);
  return (
    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 focus-within:border-primary transition-all">
      <span className="text-slate-400 font-bold text-xs">₹</span>
      <input 
        type="number" 
        value={val} 
        onChange={(e) => setVal(Number(e.target.value))}
        className="bg-transparent border-none outline-none font-black text-sm w-16 text-slate-900" 
      />
    </div>
  );
}

function SelectService({ onAdd, services, existingIds }: { onAdd: (id: string) => void, services: any[], existingIds: string[] }) {
  return (
    <Select onValueChange={(value) => onAdd(value as string)}>
      <SelectTrigger className="h-8 group border-none shadow-none bg-primary/5 hover:bg-primary/10 transition-colors rounded-lg px-3">
        <div className="flex items-center gap-2 text-primary">
          <Plus className="w-3 h-3" />
          <span className="text-[9px] font-black uppercase tracking-widest">Post Service</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {services.filter(s => !existingIds.includes(s.id)).map(s => <SelectItem key={s.id} value={s.id}>{s.name} - ₹{s.price}</SelectItem>)}
        {services.filter(s => !existingIds.includes(s.id)).length === 0 && <p className="p-2 text-[10px] text-slate-400">No new services</p>}
      </SelectContent>
    </Select>
  );
}

function SelectRoom({ onAdd, rooms, existingIds }: { onAdd: (id: string) => void, rooms: any[], existingIds: string[] }) {
  return (
    <Select onValueChange={(value) => onAdd(value as string)}>
      <SelectTrigger className="h-8 group border-none shadow-none bg-primary/5 hover:bg-primary/10 transition-colors rounded-lg px-3 w-fit">
        <div className="flex items-center gap-2 text-primary">
          <Plus className="w-3 h-3" />
          <span className="text-[9px] font-black uppercase tracking-widest">Add Room</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {rooms.filter(r => r.status === 'AVAILABLE' && !existingIds.includes(r.id)).map(r => (
          <SelectItem key={r.id} value={r.id}>Room {r.roomNumber} - {r.RoomType?.name}</SelectItem>
        ))}
        {rooms.length === 0 && <p className="p-2 text-[10px] text-slate-400">No rooms available</p>}
      </SelectContent>
    </Select>
  );
}

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Tables, TablesInsert } from "@/database.types";

