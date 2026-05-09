'use client';

import { useState, useEffect } from 'react';
import { useProperty } from '@/components/providers/property-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Hotel, 
  Clock, 
  FileText, 
  Save, 
  ShieldCheck, 
  Building2,
  Receipt,
  Fingerprint
} from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/utils/supabase/client';

export default function SettingsPage() {
  const { currentProperty } = useProperty();
  const [settings, setSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (currentProperty) {
      setSettings(currentProperty.settings || {
        defaultTaxEnabled: true,
        taxAmount: 12,
        checkinTime: '12:00',
        checkoutTime: '11:00',
        gstin: '',
        pan: '',
        fssai: ''
      });
    }
  }, [currentProperty]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !currentProperty) return;

    setIsSaving(true);
    
    const { error } = await supabase
      .from('Property')
      .update({
        settings: settings
      })
      .eq('id', currentProperty.id);

    if (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } else {
      // Simulate success delay for UI
      setTimeout(() => {
        setIsSaving(false);
        window.location.reload(); // Refresh to update context
      }, 500);
    }
  };

  if (!settings) return null;

  return (
    <div className="p-6 md:p-12 space-y-10 max-w-5xl mx-auto animate-in fade-in duration-500">
      <header className="space-y-1">
        <h1 className="text-5xl font-heading font-black tracking-tighter text-slate-900 leading-none">
          Property Settings
        </h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
          Configuration Hub • {currentProperty?.name}
        </p>
      </header>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            {/* Financial Config */}
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-heading font-black tracking-tighter">Billing & Taxation</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Revenue & Tax rules</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Checkbox 
                    id="taxEnabled" 
                    checked={settings.defaultTaxEnabled}
                    onCheckedChange={(checked) => setSettings({...settings, defaultTaxEnabled: checked})}
                    className="w-6 h-6 rounded-lg border-slate-300 data-[state=checked]:bg-primary"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor="taxEnabled" className="text-sm font-black text-slate-900 cursor-pointer">
                      Enable Default Tax Calculation
                    </label>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                      When enabled, tax will be automatically added to all new bookings.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Default Tax Rate (%)</Label>
                    <Input 
                      type="number"
                      value={settings.taxAmount}
                      onChange={e => setSettings({...settings, taxAmount: parseFloat(e.target.value)})}
                      className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                      disabled={!settings.defaultTaxEnabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timings Config */}
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-heading font-black tracking-tighter">Property Timings</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Standard Check-in/out hours</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Standard Check-In</Label>
                  <Input 
                    type="time"
                    value={settings.checkinTime}
                    onChange={e => setSettings({...settings, checkinTime: e.target.value})}
                    className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Standard Check-Out</Label>
                  <Input 
                    type="time"
                    value={settings.checkoutTime}
                    onChange={e => setSettings({...settings, checkoutTime: e.target.value})}
                    className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Legal & Compliance */}
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-heading font-black tracking-tighter">Legal & Compliance</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">GST, PAN and Licensing</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">GSTIN Number</Label>
                    <Input 
                      placeholder="22AAAAA0000A1Z5"
                      value={settings.gstin}
                      onChange={e => setSettings({...settings, gstin: e.target.value})}
                      className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">PAN Number</Label>
                    <Input 
                      placeholder="ABCDE1234F"
                      value={settings.pan}
                      onChange={e => setSettings({...settings, pan: e.target.value})}
                      className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">FSSAI Number</Label>
                    <Input 
                      placeholder="100XXXXXXXXXXX"
                      value={settings.fssai}
                      onChange={e => setSettings({...settings, fssai: e.target.value})}
                      className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-50">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">GSTIN Document (URL)</Label>
                    <Input 
                      placeholder="https://..."
                      value={settings.gstinDocUrl || ''}
                      onChange={e => setSettings({...settings, gstinDocUrl: e.target.value})}
                      className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-medium text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">PAN Document (URL)</Label>
                    <Input 
                      placeholder="https://..."
                      value={settings.panDocUrl || ''}
                      onChange={e => setSettings({...settings, panDocUrl: e.target.value})}
                      className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-medium text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">FSSAI Document (URL)</Label>
                    <Input 
                      placeholder="https://..."
                      value={settings.fssaiDocUrl || ''}
                      onChange={e => setSettings({...settings, fssaiDocUrl: e.target.value})}
                      className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-medium text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            {/* Save Card */}
            <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-primary/10 bg-primary text-white overflow-hidden sticky top-8">
              <CardHeader>
                <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4">
                  <Save className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-heading font-black tracking-tighter leading-tight">
                  Save Changes
                </CardTitle>
                <CardDescription className="text-white/60 font-bold text-xs">
                  Updated preferences will be applied globally across the property.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  className="w-full h-16 rounded-[1.5rem] bg-white text-primary hover:bg-slate-50 transition-all font-heading font-black tracking-tighter text-lg shadow-xl"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? 'UPDATING...' : 'CONFIRM SAVE'}
                </Button>
                
                <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="h-4 w-4 text-white/40" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40 leading-relaxed">
                      All changes are logged for security and audit transparency.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </form>
    </div>
  );
}
