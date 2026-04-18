'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ArrowUpRight, ArrowDownRight, Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function PaymentsPage() {
  const payments = useLiveQuery(() => db.payments.reverse().toArray(), []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight">Payments</h2>
          <p className="text-muted-foreground">Track revenue and payment status.</p>
        </div>
        <div className="flex items-center gap-3">
          <Card className="premium-card p-4 flex items-center gap-4 bg-primary/5 border-primary/10">
            <div className="p-2 bg-primary/10 rounded-full">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Monthly Revenue</p>
              <h4 className="text-lg font-bold">₹8,42,000</h4>
            </div>
          </Card>
        </div>
      </header>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by transaction ID or booking..." 
            className="pl-10 bg-card premium-card"
          />
        </div>
      </div>

      <Card className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Transaction</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Method</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {payments?.map((payment, i) => (
                <motion.tr 
                  key={payment.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">Booking #{payment.bookingId.slice(-4)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase">{payment.id}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {format(payment.updatedAt || Date.now(), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 font-bold text-sm">
                    ₹{payment.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="font-normal uppercase text-[10px]">{payment.method}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={cn(
                      "font-normal",
                      payment.status === 'PAID' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      {payment.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <FileText className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          
          {payments?.length === 0 && (
            <div className="text-center py-20">
              <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No recent transactions.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

import { cn } from "@/lib/utils";
