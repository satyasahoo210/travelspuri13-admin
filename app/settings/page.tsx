'use client';

import { useState, useEffect } from 'react';
import { useProperty } from '@/components/providers/property-provider';
import { db, PropertySetting } from '@/lib/db/dexie';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Hotel, Percent, Globe, Save, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const { currentProperty } = useProperty();
  const [settings, setSettings] = useState<PropertySetting | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!currentProperty) return;

    const loadSettings = async () => {
      const s = await db.propertySettings.get(currentProperty.id);
      if (s) {
        setSettings(s);
      } else {
        // Initialize if not exists
        const initial = {
          id: currentProperty.id,
          taxRate: 12,
          currency: 'INR',
          updatedAt: Date.now()
        };
        await db.propertySettings.put(initial);
        setSettings(initial);
      }
    };

    loadSettings();
  }, [currentProperty]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    await db.propertySettings.put({
      ...settings,
      updatedAt: Date.now()
    });
    
    // Simulate API sync delay
    setTimeout(() => {
      setIsSaving(false);
    }, 800);
  };

  if (!settings) return null;

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Property Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your hotel's billing, taxation, and regional preferences.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* General Config */}
          <Card className="md:col-span-2 border-none shadow-xl bg-card/60 backdrop-blur-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Hotel className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Financial Configuration</CardTitle>
                  <CardDescription>Rules for automated guest billing</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Property Tax Rate (%)</Label>
                  <div className="relative">
                    <Input 
                      id="taxRate"
                      type="number"
                      value={settings.taxRate}
                      onChange={e => setSettings({...settings, taxRate: parseFloat(e.target.value)})}
                      className="pl-10"
                    />
                    <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-[10px] text-muted-foreground ml-1">Applied to all Room Charges and Services.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Base Currency</Label>
                  <div className="relative">
                    <select 
                      id="currency"
                      value={settings.currency}
                      onChange={e => setSettings({...settings, currency: e.target.value})}
                      className="w-full h-10 rounded-lg border bg-background px-10 text-sm focus:ring-2 focus:ring-primary appearance-none"
                    >
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                    </select>
                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-4">
                <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                  <strong>Taxation Disclaimer:</strong> Changing the tax rate will only affect new folio items. Existing invoices will maintain their original tax calculations for audit integrity.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats/Summary */}
          <div className="space-y-6">
            <Card className="border-none shadow-xl bg-primary text-primary-foreground">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest opacity-80">Sync Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black">All Local</div>
                <p className="text-xs opacity-70 mt-1">Changes are saved instantly to IndexedDB and queued for cloud sync.</p>
                <Button variant="secondary" className="w-full mt-4 font-bold text-xs" type="submit" disabled={isSaving}>
                  {isSaving ? 'Syncing...' : 'Force Sync Now'}
                </Button>
              </CardContent>
            </Card>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-3xl bg-secondary/30 border border-secondary flex flex-col items-center text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shadow-inner">
                <Save className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Save Preferences</h4>
                <p className="text-[10px] text-muted-foreground">Apply these settings across all devices for {currentProperty?.name}.</p>
              </div>
              <Button className="w-full font-bold gap-2" type="submit" disabled={isSaving}>
                <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </motion.div>
          </div>
        </div>
      </form>
    </div>
  );
}
