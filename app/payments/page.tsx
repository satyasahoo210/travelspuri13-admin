'use client';

import { useProperty } from '@/components/providers/property-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { motion } from 'framer-motion';
import { CreditCard, FileText, IndianRupee, Loader2, Search } from "lucide-react";
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { gql, TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  notes?: string | null;
  bookingId: string;
  Booking?: {
    id: string;
    Guest?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

const GET_PAYMENTS: TypedDocumentNode<{ payments: Payment[] }> = gql`
  query GetPayments {
    payments {
      id
      amount
      method
      status
      createdAt
      notes
      bookingId
      Booking {
        id
        Guest {
          id
          name
        }
      }
    }
  }
`;

export default function PaymentsPage() {
  const { currentProperty } = useProperty();
  const [search, setSearch] = useState('');

  const { data, loading } = useQuery(GET_PAYMENTS, {
    skip: !currentProperty,
  });

  const payments = data?.payments || [];

  const monthlyRevenue = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return payments
      .filter(p => {
        const date = new Date(p.createdAt);
        return date >= start && date <= end;
      })
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => 
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      (p.Booking?.Guest?.name || 'Walk-in Guest').toLowerCase().includes(search.toLowerCase())
    );
  }, [payments, search]);

  if (loading && !payments.length) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Processing Ledger...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Payments & Ledger</h1>
          <p className="text-muted-foreground text-sm font-medium">Monitor your cash flow and transaction history.</p>
        </div>
        <div className="flex items-center gap-3">
          <Card className="border-none shadow-xl rounded-[2rem] bg-slate-900 text-white p-6 flex items-center gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-16 -mt-16" />
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
              <IndianRupee className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Monthly Revenue</p>
              <h4 className="text-2xl font-black">₹{monthlyRevenue.toLocaleString()}</h4>
            </div>
          </Card>
        </div>
      </header>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Input 
            placeholder="Search by transaction ID or guest name..." 
            className="pl-12 h-14 rounded-2xl bg-white border-none shadow-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-4 top-5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-6">Transaction Detail</th>
                <th className="px-8 py-6">Processed Date</th>
                <th className="px-8 py-6">Amount</th>
                <th className="px-8 py-6">Method</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {filteredPayments?.map((payment, i) => (
                <motion.tr 
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-white transition-all group"
                >
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-900 tracking-tight">{payment.Booking?.Guest?.name || 'Walk-in Guest'}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight mt-0.5">Booking #{payment.bookingId.slice(0, 8).toUpperCase()}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-slate-600">{format(new Date(payment.createdAt), 'MMM d, yyyy')}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{format(new Date(payment.createdAt), 'h:mm a')}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-base font-black text-slate-900">₹{Number(payment.amount).toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-6">
                    <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 font-black uppercase text-[9px] tracking-widest rounded-lg px-3 py-1">
                      {payment.method}
                    </Badge>
                  </td>
                  <td className="px-8 py-6">
                    <Badge className={cn(
                      "font-black uppercase text-[9px] tracking-widest rounded-lg px-3 py-1",
                      payment.status === 'PAID' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                    )}>
                      {payment.status}
                    </Badge>
                  </td>
                  <td className="px-8 py-6">
                    <Link href={`/invoice/${payment.bookingId}`}>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-primary transition-all">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          
          {filteredPayments?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center rotate-6 shadow-inner">
                <CreditCard className="h-10 w-10 text-slate-200" />
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No recent transactions found</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
