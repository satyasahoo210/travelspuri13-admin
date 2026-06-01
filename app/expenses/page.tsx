'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { useProperty } from '@/components/providers/property-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/utils/supabase/client'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Coins,
  DollarSign,
  Filter,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const CATEGORIES = [
  'Utilities',
  'Maintenance',
  'Salaries',
  'Food & Beverage',
  'Linen & Laundry',
  'Marketing',
  'Other',
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; fill: string }> = {
  Utilities: { bg: 'bg-indigo-50', text: 'text-indigo-600', fill: 'bg-indigo-600' },
  Maintenance: { bg: 'bg-amber-50', text: 'text-amber-600', fill: 'bg-amber-600' },
  Salaries: { bg: 'bg-emerald-50', text: 'text-emerald-600', fill: 'bg-emerald-600' },
  'Food & Beverage': { bg: 'bg-rose-50', text: 'text-rose-600', fill: 'bg-rose-600' },
  'Linen & Laundry': { bg: 'bg-sky-50', text: 'text-sky-600', fill: 'bg-sky-600' },
  Marketing: { bg: 'bg-violet-50', text: 'text-violet-600', fill: 'bg-violet-600' },
  Other: { bg: 'bg-slate-50', text: 'text-slate-600', fill: 'bg-slate-600' },
}

export default function ExpensesPage() {
  const { user } = useAuth()
  const { currentProperty } = useProperty()
  const supabase = createClient()

  // Data State
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Dialog / Form States
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [formAmount, setFormAmount] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDate, setFormDate] = useState('')

  const fetchExpenses = async () => {
    if (!currentProperty) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('Expense')
        .select('*')
        .eq('propertyId', currentProperty.id)
        .order('date', { ascending: false })

      if (fetchErr) throw fetchErr
      setExpenses(data || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [currentProperty])

  // Open Log Modal (New / Edit)
  const handleOpenDialog = (expense: any = null) => {
    if (expense) {
      setEditingExpense(expense)
      setFormAmount(expense.amount.toString())
      setFormCategory(expense.category)
      setFormDescription(expense.description || '')
      setFormDate(expense.date || new Date().toISOString().split('T')[0])
    } else {
      setEditingExpense(null)
      setFormAmount('')
      setFormCategory(CATEGORIES[0])
      setFormDescription('')
      setFormDate(new Date().toISOString().split('T')[0])
    }
    setIsDialogOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProperty || !user) return
    if (!formAmount || isNaN(parseFloat(formAmount))) {
      alert('Please enter a valid amount')
      return
    }

    setActionLoading(true)
    setError(null)
    setSuccess(null)

    const payload = {
      amount: parseFloat(formAmount),
      category: formCategory,
      description: formDescription || null,
      date: formDate || new Date().toISOString().split('T')[0],
      propertyId: currentProperty.id,
      tenantId: user.tenantId,
    }

    try {
      if (editingExpense) {
        // Update
        const { error: updateErr } = await supabase
          .from('Expense')
          .update(payload)
          .eq('id', editingExpense.id)

        if (updateErr) throw updateErr
        setSuccess('Expense record updated successfully!')
      } else {
        // Insert
        const { error: insertErr } = await supabase
          .from('Expense')
          .insert([payload])

        if (insertErr) throw insertErr
        setSuccess('New expense recorded successfully!')
      }
      setIsDialogOpen(false)
      fetchExpenses()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to save expense record')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return
    setActionLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: deleteErr } = await supabase
        .from('Expense')
        .delete()
        .eq('id', id)

      if (deleteErr) throw deleteErr
      setSuccess('Expense record deleted successfully!')
      fetchExpenses()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to delete expense record')
    } finally {
      setActionLoading(false)
    }
  }

  // Filter Logic
  const filteredExpenses = expenses.filter(exp => {
    // Search filter
    const matchesSearch =
      searchQuery === '' ||
      exp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.description || '').toLowerCase().includes(searchQuery.toLowerCase())

    // Category filter
    const matchesCategory =
      categoryFilter === 'ALL' || exp.category === categoryFilter

    // Date range filter
    const expDate = exp.date || ''
    const matchesStart = startDate === '' || expDate >= startDate
    const matchesEnd = endDate === '' || expDate <= endDate

    return matchesSearch && matchesCategory && matchesStart && matchesEnd
  })

  // Calculations
  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  // Current Month Total Calculation
  const currentMonthStr = new Date().toISOString().substring(0, 7) // "yyyy-MM"
  const mtdExpensesTotal = expenses
    .filter(e => e.date && e.date.startsWith(currentMonthStr))
    .reduce((sum, e) => sum + (e.amount || 0), 0)

  // Category breakdown calculations (for MTD or all depending on selection)
  const categorySummary = CATEGORIES.map(cat => {
    const total = expenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + (e.amount || 0), 0)
    return { category: cat, total }
  }).filter(c => c.total > 0)

  const overallTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 p-4 md:p-10 selection:bg-primary/20">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

        {/* Navigation & Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Receipt className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary/80">PMS Financials</span>
            </div>
            <h1 className="text-3xl font-heading font-black text-slate-900 tracking-tight leading-none uppercase">Expense Registry</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1.5">
              Record and audit operational expenses for {currentProperty?.name || 'Property'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50 shrink-0"
              onClick={fetchExpenses}
              disabled={loading}
            >
              <RefreshCw className={`w-4.5 h-4.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            </Button>
            <Button
              onClick={() => handleOpenDialog()}
              className="flex-1 sm:flex-none rounded-xl font-black text-xs tracking-widest uppercase h-12 px-6 shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4.5 h-4.5 mr-2" /> Log Expense
            </Button>
          </div>
        </header>

        {/* Alerts */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-5 rounded-2xl flex items-center gap-4 shadow-sm"
            >
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <p className="font-black tracking-tight flex-1 text-sm">{success}</p>
              <Button variant="ghost" size="icon" className="text-emerald-500 hover:bg-emerald-100/50" onClick={() => setSuccess(null)}>
                <X className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-50 border border-red-100 text-red-600 p-5 rounded-2xl flex items-center gap-4 shadow-sm"
            >
              <AlertCircle className="w-6 h-6 shrink-0" />
              <p className="font-black tracking-tight flex-1 text-sm">{error}</p>
              <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-100/50" onClick={() => setError(null)}>
                <X className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Statistics Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Quick Metrics Cards */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Card className="bg-white border-slate-200 rounded-[2rem] shadow-sm p-6 flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block leading-none">Total Expenses logged</span>
                <span className="text-3xl font-heading font-black text-slate-900 block text-center">₹{overallTotal.toLocaleString()}</span>
                <span className="text-[9px] font-bold text-slate-400 block">Across all categories and dates</span>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
            </Card>

            <Card className="bg-white border-slate-200 rounded-[2rem] shadow-sm p-6 flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block leading-none">Month-to-Date (MTD)</span>
                <span className="text-3xl font-heading font-black text-slate-900 block text-center">₹{mtdExpensesTotal.toLocaleString()}</span>
                <span className="text-[9px] font-bold text-slate-400 block">Expenses recorded in current month</span>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Coins className="w-6 h-6" />
              </div>
            </Card>

            <Card className="bg-white border-slate-200 rounded-[2rem] shadow-sm p-6 flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block leading-none">Current Filter total</span>
                <span className="text-3xl font-heading font-black text-primary block text-center">₹{totalFiltered.toLocaleString()}</span>
                <span className="text-[9px] font-bold text-slate-400 block">Matching search criteria ({filteredExpenses.length} items)</span>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
            </Card>
          </div>

          {/* Category Allocation Graph Card */}
          <div className="lg:col-span-7">
            <Card className="bg-white border-slate-200 rounded-[2rem] shadow-sm p-6 md:p-8 h-full flex flex-col justify-between">
              <div>
                <h3 className="font-heading font-black text-slate-900 uppercase tracking-tight text-lg">Category Allocation</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Budget weight across operations</p>
              </div>

              {categorySummary.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <p className="font-bold text-xs uppercase tracking-wider">No Allocations Recorded</p>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  {categorySummary
                    .sort((a, b) => b.total - a.total)
                    .map(item => {
                      const percentage = overallTotal > 0 ? (item.total / overallTotal) * 100 : 0
                      const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other
                      return (
                        <div key={item.category} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-600">{item.category}</span>
                            <span className="text-slate-950">
                              ₹{item.total.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({percentage.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full ${colors.fill}`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Expenses List Panel */}
        <section className="space-y-6">

          {/* Filters Bar */}
          <Card className="bg-white border-slate-200 rounded-[2rem] shadow-sm p-6 flex flex-col lg:flex-row items-center gap-4 justify-between">

            {/* Search Input */}
            <div className="relative w-full lg:max-w-md group flex items-center">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search description or category..."
                className="pl-12! h-12 rounded-xl text-sm border-slate-200 bg-slate-50 font-bold"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Select & Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">

              {/* Category Filter */}
              <div className="flex flex-col gap-1.5">
                <Select value={categoryFilter} onValueChange={val => setCategoryFilter(val || 'ALL')}>
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-xl">
                    <SelectItem value="ALL" className="font-bold py-2">All Categories</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat} className="font-bold py-2">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="relative">
                <Input
                  type="date"
                  className="h-12 border-slate-200 bg-slate-50 rounded-xl font-bold text-xs"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  placeholder="Start Date"
                />
              </div>

              {/* End Date */}
              <div className="relative">
                <Input
                  type="date"
                  className="h-12 border-slate-200 bg-slate-50 rounded-xl font-bold text-xs"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  placeholder="End Date"
                />
              </div>

            </div>

            {/* Clear Filters Button */}
            {(searchQuery || categoryFilter !== 'ALL' || startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-700 font-bold text-xs uppercase shrink-0"
                onClick={() => {
                  setSearchQuery('')
                  setCategoryFilter('ALL')
                  setStartDate('')
                  setEndDate('')
                }}
              >
                Clear Filters
              </Button>
            )}

          </Card>

          {/* Expenses Table */}
          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Description</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/25" />
                      </td>
                    </tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                        No expenses found matching the criteria
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map(exp => {
                      const colors = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.Other
                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors group">
                          {/* Date */}
                          <td className="px-8 py-5 text-sm font-bold text-slate-700">
                            {exp.date ? new Date(exp.date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '-'}
                          </td>

                          {/* Category Badge */}
                          <td className="px-8 py-5">
                            <Badge className={`font-bold text-[9px] tracking-widest uppercase px-3 py-1 ${colors.bg} ${colors.text} border border-current/10 shadow-none`}>
                              {exp.category}
                            </Badge>
                          </td>

                          {/* Amount */}
                          <td className="px-8 py-5 text-sm font-black text-slate-900">
                            ₹{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>

                          {/* Description */}
                          <td className="px-8 py-5 text-sm font-medium text-slate-500 max-w-xs truncate">
                            {exp.description || '-'}
                          </td>

                          {/* Actions */}
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 active:scale-95"
                                onClick={() => handleOpenDialog(exp)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 active:scale-95"
                                onClick={() => handleDeleteExpense(exp.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </section>

        {/* Dialog for Log/Edit Expense */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-2xl p-0 rounded-[2.5rem] border-none shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
            <div className="p-8 md:p-12">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
                  {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleFormSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Amount (INR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      placeholder="500.00"
                      value={formAmount}
                      onChange={e => setFormAmount(e.target.value)}
                      className="bg-slate-50 border-slate-200 rounded-xl h-12 font-bold focus:bg-white"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Category</Label>
                    <Select value={formCategory} onValueChange={val => setFormCategory(val || CATEGORIES[0])}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold focus:bg-white">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 rounded-xl">
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat} className="font-bold py-2">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Expense Date</Label>
                    <Input
                      type="date"
                      required
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      className="bg-slate-50 border-slate-200 rounded-xl h-12 font-bold focus:bg-white"
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

            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
