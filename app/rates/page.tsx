'use client';

import { useState, useEffect } from 'react';
import { useProperty } from '@/components/providers/property-provider';
import { db, RoomType, RateOverride } from '@/lib/db/dexie';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Tag, Trash2, ArrowRight, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function RatesPage() {
  const { currentProperty } = useProperty();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [overrides, setOverrides] = useState<RateOverride[]>([]);
  const [newOverride, setNewOverride] = useState({
    roomTypeId: '',
    startDate: '',
    endDate: '',
    rate: ''
  });

  useEffect(() => {
    if (!currentProperty) return;

    const loadData = async () => {
      const rt = await db.roomTypes.where('propertyId').equals(currentProperty.id).toArray();
      const ov = await db.rateOverrides.toArray();
      setRoomTypes(rt);
      setOverrides(ov);
    };

    loadData();
  }, [currentProperty]);

  const handleCreateOverride = async () => {
    if (!newOverride.roomTypeId || !newOverride.startDate || !newOverride.endDate || !newOverride.rate) return;

    const override: RateOverride = {
      id: `ov_${Date.now()}`,
      roomTypeId: newOverride.roomTypeId,
      startDate: newOverride.startDate,
      endDate: newOverride.endDate,
      rate: parseFloat(newOverride.rate),
      updatedAt: Date.now()
    };

    await db.rateOverrides.put(override);
    setOverrides([...overrides, override]);
    setNewOverride({
      roomTypeId: '',
      startDate: '',
      endDate: '',
      rate: ''
    });
  };

  const deleteOverride = async (id: string) => {
    await db.rateOverrides.delete(id);
    setOverrides(overrides.filter(o => o.id !== id));
  };

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Revenue Manager</h1>
        <p className="text-muted-foreground mt-1">Configure price overrides for seasons, holidays, and high-demand events.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Form */}
        <Card className="lg:col-span-1 border-none shadow-xl bg-card/60 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-lg">Set Seasonal Rate</CardTitle>
            <CardDescription>Target a specific room type and date range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Room Type</Label>
              <select 
                className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                value={newOverride.roomTypeId}
                onChange={e => setNewOverride({...newOverride, roomTypeId: e.target.value})}
              >
                <option value="">Select a type...</option>
                {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <div className="relative">
                  <Input 
                    type="date"
                    value={newOverride.startDate}
                    onChange={e => setNewOverride({...newOverride, startDate: e.target.value})}
                    className="pl-10"
                  />
                  <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <div className="relative">
                  <Input 
                    type="date"
                    value={newOverride.endDate}
                    onChange={e => setNewOverride({...newOverride, endDate: e.target.value})}
                    className="pl-10"
                  />
                  <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Special Rate (₹)</Label>
              <div className="relative">
                <Input 
                  type="number"
                  placeholder="e.g. 5000"
                  value={newOverride.rate}
                  onChange={e => setNewOverride({...newOverride, rate: e.target.value})}
                  className="pl-10"
                />
                <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <Button className="w-full font-bold gap-2 mt-4" onClick={handleCreateOverride}>
              Apply Rate Override
            </Button>
          </CardContent>
        </Card>

        {/* Existing Overrides List */}
        <Card className="lg:col-span-2 border-none shadow-xl bg-card/60 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-lg">Active & Future Overrides</CardTitle>
            <CardDescription>Scheduled price adjustments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AnimatePresence>
                {overrides.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
                    <TrendingUp className="h-10 w-10 mx-auto opacity-20 mb-3" />
                    No rate overrides scheduled.
                  </div>
                ) : (
                  overrides.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map((ov) => {
                    const roomType = roomTypes.find(t => t.id === ov.roomTypeId);
                    return (
                      <motion.div
                        key={ov.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border/40 hover:border-primary/30 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                            <Tag className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-bold text-sm">{roomType?.name || 'Unknown Type'}</div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                              <span>{ov.startDate}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>{ov.endDate}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-black text-primary">₹{ov.rate.toLocaleString()}</div>
                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
                              {ov.rate > (roomType?.baseRate || 0) ? '↑ Increased' : '↓ Discounted'}
                            </Badge>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteOverride(ov.id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
