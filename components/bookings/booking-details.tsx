import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from 'next/link';
import { 
  Calendar, 
  User, 
  MapPin, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Plus,
  Receipt,
  RotateCcw,
  BedDouble,
  Users,
  TrendingUp,
  Tag
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db, Booking } from "@/lib/db/dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BookingDetailsProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingDetails({ booking, open, onOpenChange }: BookingDetailsProps) {
  const [isPosting, setIsPosting] = useState(false);
  const guest = useLiveQuery(async () => {
    if (!booking) return undefined;
    const g = await db.guests.get(booking.guestId);
    return g || undefined;
  }, [booking]);
  const folioItems = useLiveQuery(
    async () => booking ? await db.folioItems.where('bookingId').equals(booking.id).toArray() : [],
    [booking]
  );

  if (!booking) return null;

  const totalFolio = folioItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const payments = folioItems?.filter(i => i.type === 'PAYMENT').reduce((sum, item) => sum + Math.abs(item.amount), 0) || 0;
  const balance = totalFolio - payments;

  const handleAddCharge = async () => {
    const desc = prompt("Charge Description:");
    const amount = prompt("Amount (₹):");
    if (desc && amount) {
      await db.folioItems.add({
        id: `f_${Date.now()}`,
        bookingId: booking.id,
        propertyId: 'p1',
        description: desc,
        amount: parseFloat(amount),
        type: 'AD_HOC',
        updatedAt: Date.now()
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md premium-card backdrop-blur-xl border-l-white/20 flex flex-col h-full">
        <SheetHeader className="pb-6 border-b">
          <div className="flex justify-between items-start">
            <Badge 
              className={cn(
                "mb-2 font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-widest",
                booking.status === 'CONFIRMED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                booking.status === 'CHECKED_IN' ? "bg-primary/10 text-primary border-primary/20" :
                "bg-secondary text-secondary-foreground"
              )}
            >
              {booking.status.replace('_', ' ')}
            </Badge>
          </div>
          <SheetTitle className="text-2xl font-heading font-extrabold tracking-tight">
            Booking Details
          </SheetTitle>
          <SheetDescription className="font-mono text-[10px] font-bold uppercase text-muted-foreground mt-1">
            Reference: {booking.id}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col mt-6 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 bg-secondary/30 p-1 rounded-xl">
            <TabsTrigger value="details" className="rounded-lg font-bold text-xs">Details</TabsTrigger>
            <TabsTrigger value="folio" className="rounded-lg font-bold text-xs">Digital Folio</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-y-auto pr-2 mt-4 space-y-8">
            {/* Guest Info */}
            <section className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Guest Information</h4>
              <div className="bg-primary/5 rounded-2xl p-4 flex items-center gap-4 border border-primary/10">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-lg leading-tight">{guest?.name || "Guest"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Primary Guest • Platinum Member</p>
                </div>
              </div>
            </section>

            {/* Stay Info */}
            <section className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Stay Duration</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/30 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase">Check-In</span>
                  </div>
                  <p className="font-bold">{format(booking.checkInDate, 'MMM d, yyyy')}</p>
                  <p className="text-[10px] text-muted-foreground">Standard • 14:00</p>
                </div>
                <div className="bg-secondary/30 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase">Check-Out</span>
                  </div>
                  <p className="font-bold">{format(booking.checkOutDate, 'MMM d, yyyy')}</p>
                  <p className="text-[10px] text-muted-foreground">Late • 12:00</p>
                </div>
              </div>
            </section>

            {/* Notes Section */}
            <section className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Internal Notes</h4>
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-xs text-amber-700 leading-relaxed italic">
                "Guest prefers high floor and extra pillows. Anniversary stay - complementary cake arranged."
              </div>
            </section>
          </TabsContent>

          <TabsContent value="folio" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Transaction Ledger</h4>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold gap-1 text-primary hover:bg-primary/5" onClick={handleAddCharge}>
                <Plus className="h-3 w-3" /> Post Charge
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {folioItems?.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-secondary/20 rounded-xl border border-border/40 text-xs">
                  <div className="flex gap-3 items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      item.type === 'ROOM_CHARGE' ? "bg-blue-500/10 text-blue-600" :
                      item.type === 'FB' ? "bg-orange-500/10 text-orange-600" :
                      item.type === 'TAX' ? "bg-slate-500/10 text-slate-600" :
                      "bg-primary/10 text-primary"
                    )}>
                      {item.type === 'ROOM_CHARGE' ? <BedDouble className="h-4 w-4" /> :
                       item.type === 'FB' ? <Users className="h-4 w-4" /> :
                       <Receipt className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-bold">{item.description}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">{item.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="font-bold">₹{item.amount.toLocaleString()}</div>
                </div>
              ))}
            </div>

            <Card className="mt-4 border-none shadow-none bg-primary/5 rounded-2xl overflow-hidden">
               <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold text-muted-foreground">
                    <span>Summary</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₹{(totalFolio - (folioItems?.filter(i => i.type === 'TAX').reduce((s, i) => s + i.amount, 0) || 0)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Total Taxes</span>
                    <span className="font-medium">₹{(folioItems?.filter(i => i.type === 'TAX').reduce((s, i) => s + i.amount, 0) || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-primary/20">
                    <span className="font-bold text-sm">Balance Due</span>
                    <span className="text-xl font-extrabold text-primary">₹{balance.toLocaleString()}</span>
                  </div>
               </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <SheetFooter className="gap-2 sm:gap-2 mt-6 pt-6 border-t flex-row items-center">
          <Link href={`/invoice/${booking.id}`} target="_blank">
            <Button variant="outline" className="w-full gap-2 font-bold py-6 group">
              <Receipt className="h-4 w-4 group-hover:scale-110 transition-transform" />
              Invoice
            </Button>
          </Link>
          <Button className="flex-1 rounded-xl h-12 font-bold shadow-lg shadow-primary/20">
            <CreditCard className="mr-2 h-4 w-4" />
            Settle Folio
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
