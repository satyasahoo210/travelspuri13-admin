'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tables } from '@/database.types';
import { createClient } from '@/lib/utils/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  Loader2,
  Plus,
  ShieldCheck,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'users' | 'tenants'>('users');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF' as Tables<'User'>['role'],
    tenantId: ''
  });

  const [tenantForm, setTenantForm] = useState({
    tenantName: '',
    tenantEmail: '',
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });

  // Verify super admin access
  if (user && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-slate-500 mb-6">This area is reserved for Super Administrators only.</p>
        <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
        options: {
          data: {
            name: userForm.name,
            role: userForm.role,
            tenantId: userForm.tenantId
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: dbError } = await supabase
          .from('User')
          .insert({
            id: authData.user.id,
            email: userForm.email,
            name: userForm.name,
            role: userForm.role,
            tenantId: userForm.tenantId
          });
        
        if (dbError) throw dbError;
      }

      setSuccess(`User ${userForm.email} created successfully!`);
      setUserForm({ name: '', email: '', password: '', role: 'STAFF', tenantId: '' });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: tenantData, error: tenantError } = await supabase
        .from('Tenant')
        .insert({
          name: tenantForm.tenantName,
          email: tenantForm.tenantEmail,
          featureFlags: null,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tenantForm.adminEmail,
        password: tenantForm.adminPassword,
        options: {
          data: {
            name: tenantForm.adminName,
            role: 'TENANT_ADMIN',
            tenantId: tenantData.id
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: dbError } = await supabase
          .from('User')
          .insert({
            id: authData.user.id,
            email: tenantForm.adminEmail,
            name: tenantForm.adminName,
            role: 'TENANT_ADMIN',
            tenantId: tenantData.id
          });
        
        if (dbError) throw dbError;
      }

      setSuccess(`Tenant ${tenantForm.tenantName} created with admin ${tenantForm.adminEmail}`);
      setTenantForm({ tenantName: '', tenantEmail: '', adminName: '', adminEmail: '', adminPassword: '' });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 selection:bg-primary/20">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary/80">Global Admin</span>
            </div>
            <h1 className="text-3xl font-heading font-black tracking-tight text-slate-900">Travels Puri Admin Center</h1>
          </div>
          <Button variant="outline" className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600" onClick={() => router.push('/dashboard')}>
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </header>

        {/* Tab Switcher */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200/50 shadow-inner">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-bold text-sm ${activeTab === 'users' ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
          >
            <Users className="w-4 h-4" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('tenants')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-bold text-sm ${activeTab === 'tenants' ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
          >
            <Building2 className="w-4 h-4" />
            Tenant Systems
          </button>
        </div>

        {/* Notifications */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-2xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-semibold">{success}</p>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5" />
              <p className="font-semibold">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forms Container */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'users' ? (
            <Card className="bg-white border-slate-200 overflow-hidden rounded-[2rem] shadow-xl shadow-slate-200/50">
              <CardHeader className="p-8 border-b border-slate-100">
                <CardTitle className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Register New Authority</CardTitle>
                <CardDescription className="text-slate-500">Access point to initialize new user credentials and tenant associations.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-black uppercase text-slate-400 tracking-wider">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={userForm.name}
                        onChange={e => setUserForm({...userForm, name: e.target.value})}
                        className="premium-input bg-slate-50 border-slate-200 focus:bg-white transition-all h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-black uppercase text-slate-400 tracking-wider">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={userForm.email}
                        onChange={e => setUserForm({...userForm, email: e.target.value})}
                        className="premium-input bg-slate-50 border-slate-200 focus:bg-white transition-all h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-xs font-black uppercase text-slate-400 tracking-wider">System Role</Label>
                      <Select
                        onValueChange={(val: Tables<'User'>['role']) => setUserForm({...userForm, role: val})}
                        defaultValue={userForm.role}
                      >
                        <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:bg-white rounded-xl text-slate-900">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 shadow-2xl">
                          <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                          <SelectItem value="TENANT_ADMIN">Tenant Admin</SelectItem>
                          <SelectItem value="PROPERTY_MANAGER">Property Manager</SelectItem>
                          <SelectItem value="STAFF">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="tenant" className="text-xs font-black uppercase text-slate-400 tracking-wider">Target Tenant ID</Label>
                      <Input
                        id="tenant"
                        placeholder="UUID of the tenant"
                        value={userForm.tenantId}
                        onChange={e => setUserForm({...userForm, tenantId: e.target.value})}
                        className="premium-input bg-slate-50 border-slate-200 focus:bg-white transition-all h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pass" className="text-xs font-black uppercase text-slate-400 tracking-wider">Access Password</Label>
                      <Input
                        id="pass"
                        type="password"
                        placeholder="••••••••"
                        value={userForm.password}
                        onChange={e => setUserForm({...userForm, password: e.target.value})}
                        className="premium-input bg-slate-50 border-slate-200 focus:bg-white transition-all h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="pt-6">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5 mr-2" /> Initialize Account</>}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white border-slate-200 overflow-hidden rounded-[2rem] shadow-xl shadow-slate-200/50">
              <CardHeader className="p-8 border-b border-slate-100">
                <CardTitle className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Deploy New Tenant Environment</CardTitle>
                <CardDescription className="text-slate-500">Global provisioning engine for multi-tenant cells and administrators.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleCreateTenant} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em] opacity-80">Tenant Information</h3>
                    <div className="space-y-2">
                      <Label htmlFor="tname" className="text-xs font-black uppercase text-slate-400 tracking-wider">Organization Name</Label>
                      <Input
                        id="tname"
                        placeholder="Grand Imperial Hotels"
                        value={tenantForm.tenantName}
                        onChange={e => setTenantForm({...tenantForm, tenantName: e.target.value})}
                        className="premium-input bg-slate-50 border-slate-200 focus:bg-white transition-all h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="temail" className="text-xs font-black uppercase text-slate-400 tracking-wider">Corporate Email</Label>
                      <Input
                        id="temail"
                        type="email"
                        placeholder="contact@hotel.com"
                        value={tenantForm.tenantEmail}
                        onChange={e => setTenantForm({...tenantForm, tenantEmail: e.target.value})}
                        className="premium-input bg-slate-50 border-slate-200 focus:bg-white transition-all h-12 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em] opacity-80">Admin Credentials</h3>
                    <div className="space-y-2">
                      <Label htmlFor="aname" className="text-xs font-black uppercase text-slate-400 tracking-wider">Admin Full Name</Label>
                      <Input
                        id="aname"
                        placeholder="Hotel Manager"
                        value={tenantForm.adminName}
                        onChange={e => setTenantForm({...tenantForm, adminName: e.target.value})}
                        className="premium-input bg-slate-50 border-slate-200 focus:bg-white transition-all h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aemail" className="text-xs font-black uppercase text-slate-400 tracking-wider">Admin Email</Label>
                      <Input
                        id="aemail"
                        type="email"
                        placeholder="admin@hotel.com"
                        value={tenantForm.adminEmail}
                        onChange={e => setTenantForm({...tenantForm, adminEmail: e.target.value})}
                        className="premium-input bg-slate-50 border-slate-200 focus:bg-white transition-all h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apass" className="text-xs font-black uppercase text-slate-400 tracking-wider">Admin Password</Label>
                      <Input
                        id="apass"
                        type="password"
                        placeholder="••••••••"
                        value={tenantForm.adminPassword}
                        onChange={e => setTenantForm({...tenantForm, adminPassword: e.target.value})}
                        className="premium-input bg-slate-50 border-slate-200 focus:bg-white transition-all h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="pt-6">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 rounded-2xl text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5 mr-2" /> Provision System</>}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      <style jsx global>{`
        .premium-input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 2px rgba(var(--primary), 0.1) !important;
        }
      `}</style>
    </div>
  );
}
