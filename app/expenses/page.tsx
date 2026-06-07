'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { useProperty } from '@/components/providers/property-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { gql, TypedDocumentNode } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface Expense {
  id: string;
  amount: number;
  category: string;
  description?: string | null;
  date: string;
  propertyId: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const GET_EXPENSES: TypedDocumentNode<{ expenses: Expense[] }, { propertyId: string }> = gql`
  query GetExpenses($propertyId: String!) {
    expenses(propertyId: $propertyId) {
      id
      amount
      category
      description
      date
      propertyId
      createdAt
    }
  }
`;

const CREATE_EXPENSE: TypedDocumentNode<{ createExpense: Expense }, { input: any }> = gql`
  mutation CreateExpense($input: CreateExpenseInput!) {
    createExpense(input: $input) {
      id
      amount
      category
      description
      date
      propertyId
    }
  }
`;

const UPDATE_EXPENSE: TypedDocumentNode<{ updateExpense: Expense }, { id: string, input: any }> = gql`
  mutation UpdateExpense($id: ID!, $input: UpdateExpenseInput!) {
    updateExpense(id: $id, input: $input) {
      id
      amount
      category
      description
      date
      propertyId
    }
  }
`;

const DELETE_EXPENSE: TypedDocumentNode<{ deleteExpense: Expense }, { id: string }> = gql`
  mutation DeleteExpense($id: ID!) {
    deleteExpense(id: $id) {
      id
    }
  }
`;

const CATEGORIES = [
  'Utilities',
  'Maintenance',
  'Salaries',
  'Food & Beverage',
  'Linen & Laundry',
  'Marketing',
  'Other',
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; fill: string }> = {
  Utilities: { bg: 'bg-indigo-50', text: 'text-indigo-600', fill: 'bg-indigo-600' },
  Maintenance: { bg: 'bg-amber-50', text: 'text-amber-600', fill: 'bg-amber-600' },
  Salaries: { bg: 'bg-emerald-50', text: 'text-emerald-600', fill: 'bg-emerald-600' },
  'Food & Beverage': { bg: 'bg-rose-50', text: 'text-rose-600', fill: 'bg-rose-600' },
  'Linen & Laundry': { bg: 'bg-sky-50', text: 'text-sky-600', fill: 'bg-sky-600' },
  Marketing: { bg: 'bg-violet-50', text: 'text-violet-600', fill: 'bg-violet-600' },
  Other: { bg: 'bg-slate-50', text: 'text-slate-600', fill: 'bg-slate-600' },
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const { currentProperty } = useProperty();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dialog / Form States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: queryData, loading, refetch } = useQuery(GET_EXPENSES, {
    variables: { propertyId: currentProperty?.id || '' },
    skip: !currentProperty?.id,
  });

  const [createExpense] = useMutation(CREATE_EXPENSE);
  const [updateExpense] = useMutation(UPDATE_EXPENSE);
  const [deleteExpenseMutation] = useMutation(DELETE_EXPENSE);

  const expenses = queryData?.expenses || [];

  const fetchExpenses = async () => {
    try {
      setError(null);
      await refetch();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sync expenses');
    }
  };

  // Open Log Modal (New / Edit)
  const handleOpenDialog = (expense: any = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormAmount(expense.amount.toString());
      setFormCategory(expense.category);
      setFormDescription(expense.description || '');
      setFormDate(expense.date || new Date().toISOString().split('T')[0]);
    } else {
      setEditingExpense(null);
      setFormAmount('');
      setFormCategory(CATEGORIES[0]);
      setFormDescription('');
      setFormDate(new Date().toISOString().split('T')[0]);
    }
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProperty || !user) return;
    if (!formAmount || isNaN(parseFloat(formAmount))) {
      alert('Please enter a valid amount');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingExpense) {
        // Update
        await updateExpense({
          variables: {
            id: editingExpense.id,
            input: {
              amount: parseFloat(formAmount),
              category: formCategory,
              description: formDescription || null,
              date: formDate || new Date().toISOString().split('T')[0],
            }
          }
        });

        setSuccess('Expense record updated successfully!');
      } else {
        // Insert
        await createExpense({
          variables: {
            input: {
              amount: parseFloat(formAmount),
              category: formCategory,
              description: formDescription || null,
              date: formDate || new Date().toISOString().split('T')[0],
              propertyId: currentProperty.id,
            }
          }
        });

        setSuccess('New expense recorded successfully!');
      }
      setIsDialogOpen(false);
      await refetch();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save expense record');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteExpenseMutation({
        variables: { id }
      });

      setSuccess('Expense record deleted successfully!');
      await refetch();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to delete expense record');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered & Sorted list
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(exp => {
        // Search filter
        const matchesSearch = exp.description
          ? exp.description.toLowerCase().includes(searchQuery.toLowerCase())
          : false || exp.category.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Category filter
        const matchesCategory = categoryFilter === 'ALL' || exp.category === categoryFilter;

        // Date filter
        const expDate = new Date(exp.date);
        const matchesStart = !startDate || expDate >= new Date(startDate);
        const matchesEnd = !endDate || expDate <= new Date(endDate);

        return matchesSearch && matchesCategory && matchesStart && matchesEnd;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchQuery, categoryFilter, startDate, endDate]);

  // Aggregate Metrics
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);

  const categoryAggregates = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredExpenses]);

  return (
    <div className="p-4 md:p-10 space-y-8 max-w-7xl mx-auto bg-slate-50/30 min-h-screen selection:bg-primary/20">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <Badge variant="secondary" className="px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest mb-1.5 border-none">
            <Coins className="h-3.5 w-3.5 mr-1" /> Treasury Operations
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase leading-none">Expense Ledger</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1.5 flex items-center gap-1.5">
            Logging cashflow parameters for <span className="text-slate-700 font-black">{currentProperty?.name}</span>
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto relative z-10">
          <Button
            variant="outline"
            onClick={fetchExpenses}
            className="flex-1 md:flex-none h-14 rounded-2xl border-slate-200 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Sync Data
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            className="flex-1 md:flex-none h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[11px] gap-2 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" /> Log Expense
          </Button>
        </div>
      </header>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="bg-slate-900 text-white rounded-[2rem] border-none shadow-2xl p-8 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
          <div>
            <Wallet className="h-6 w-6 text-primary mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Filtered Outflow</p>
          </div>
          <h2 className="text-4xl font-black tracking-tight mt-2">₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
        </Card>

        {CATEGORIES.slice(0, 2).map((cat) => {
          const amt = categoryAggregates[cat] || 0;
          const config = CATEGORY_COLORS[cat];
          return (
            <Card key={cat} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 flex flex-col justify-between min-h-[160px]">
              <div>
                <span className={cn("inline-block h-3.5 w-3.5 rounded-full mb-4", config.fill)} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{cat} Segment</p>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mt-2">₹{amt.toLocaleString()}</h2>
            </Card>
          );
        })}
      </div>

      {/* Filters Hub */}
      <div className="p-6 bg-white rounded-3xl border shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5">
          <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Search Description</Label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="e.g. Electric bill..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-medium"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Category Segment</Label>
          <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || 'ALL')}>
            <SelectTrigger className="h-11 border-slate-200 rounded-xl bg-slate-50 text-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="ALL">All Segments</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">From Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="h-11 border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">To Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="h-11 border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-medium"
          />
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-5 rounded-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="font-bold text-sm">{success}</p>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="bg-red-50 border border-red-100 text-red-600 p-5 rounded-2xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-bold text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ledger Table */}
      {loading && !expenses.length ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-3xl" />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <Card className="h-[260px] flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50 border border-dashed rounded-3xl border-slate-200 p-8">
          <div className="p-3 bg-white rounded-2xl border shadow-sm">
            <Receipt className="h-8 w-8 text-slate-300" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 uppercase text-base tracking-tight">Ledger Empty</h3>
            <p className="text-slate-400 text-xs font-semibold mt-1">No transaction records match the current filter query.</p>
          </div>
        </Card>
      ) : (
        <Card className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="p-6">Date</th>
                  <th className="p-6">Category</th>
                  <th className="p-6">Description</th>
                  <th className="p-6">Amount</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {filteredExpenses.map((exp) => {
                  const colors = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.Other;
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="p-6 font-bold text-slate-800">{format(new Date(exp.date), 'dd MMM yyyy')}</td>
                      <td className="p-6">
                        <Badge className={cn("rounded-lg border-none px-3 py-1 font-black uppercase text-[9px] tracking-wider", colors.bg, colors.text)}>
                          {exp.category}
                        </Badge>
                      </td>
                      <td className="p-6 text-slate-500 max-w-sm truncate">{exp.description || '-'}</td>
                      <td className="p-6 font-black text-slate-900 text-base">₹{exp.amount.toLocaleString()}</td>
                      <td className="p-6 text-right">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(exp)}
                            className="h-9 w-9 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 active:scale-95 transition-all"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="h-9 w-9 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 active:scale-95 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 max-h-[95vh] overflow-y-auto bg-white">
          <div className="bg-slate-900 p-8 text-white">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">{editingExpense ? 'Modify Outflow Record' : 'Record Treasury Outflow'}</DialogTitle>
            <p className="text-white/60 font-semibold text-xs mt-1">Specify parameters to log and account for the property expenses.</p>
          </div>
          <form onSubmit={handleFormSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Amount */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Outflow Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  required
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  className="bg-slate-50 border-slate-200 rounded-xl h-12 font-bold focus:bg-white"
                  disabled={actionLoading}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Category Segment</Label>
                <Select value={formCategory} onValueChange={(val) => setFormCategory(val || '')} disabled={actionLoading}>
                  <SelectTrigger className="h-12 border-slate-200 rounded-xl bg-slate-50 text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 shadow-2xl">
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-2 col-span-full">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Transaction Date</Label>
                <Input
                  type="date"
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="bg-slate-50 border-slate-200 rounded-xl h-12 font-bold focus:bg-white"
                  disabled={actionLoading}
                />
              </div>

              {/* Description */}
              <div className="space-y-2 col-span-full">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Description</Label>
                <textarea
                  placeholder="Describe the nature of the expense (e.g. Electric bill for Block A)"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-900 focus:bg-white focus:border-primary outline-none min-h-[100px] text-sm"
                  disabled={actionLoading}
                />
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl h-12 px-6 font-bold text-slate-400 uppercase text-xs"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="rounded-xl h-12 px-8 font-bold text-xs uppercase shadow-md hover:shadow-lg transition-all"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : editingExpense ? 'Update Record' : 'Record Expense'}
              </Button>
            </div>

          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
