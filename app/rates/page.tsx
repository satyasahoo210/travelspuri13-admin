'use client';

import { useState } from 'react';
import { useProperty } from '@/components/providers/property-provider';
import { gql, TypedDocumentNode } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Tag, Trash2, ArrowRight, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface GqlRoomType {
  id: string;
  name: string;
  defaultPrice: number;
}

interface GqlRateOverride {
  id: string;
  roomTypeId: string;
  startDate: string;
  endDate: string;
  rate: number;
  RoomType?: {
    id: string;
    name: string;
    defaultPrice: number;
  };
}

interface RoomTypesQueryData {
  roomTypes: GqlRoomType[];
}

interface RateOverridesQueryData {
  rateOverrides: GqlRateOverride[];
}

interface CreateRateOverrideMutationData {
  createRateOverride: GqlRateOverride;
}

interface CreateRateOverrideMutationVariables {
  input: {
    roomTypeId: string;
    startDate: string;
    endDate: string;
    rate: number;
  };
}

interface DeleteRateOverrideMutationData {
  deleteRateOverride: GqlRateOverride;
}

interface DeleteRateOverrideMutationVariables {
  id: string;
}

const GET_ROOM_TYPES: TypedDocumentNode<RoomTypesQueryData, { propertyId: string }> = gql`
  query GetRoomTypes($propertyId: String!) {
    roomTypes(propertyId: $propertyId) {
      id
      name
      defaultPrice
    }
  }
`;

const GET_RATE_OVERRIDES: TypedDocumentNode<RateOverridesQueryData> = gql`
  query GetRateOverrides {
    rateOverrides {
      id
      roomTypeId
      startDate
      endDate
      rate
      RoomType {
        id
        name
        defaultPrice
      }
    }
  }
`;

const CREATE_RATE_OVERRIDE: TypedDocumentNode<CreateRateOverrideMutationData, CreateRateOverrideMutationVariables> = gql`
  mutation CreateRateOverride($input: CreateRateOverrideInput!) {
    createRateOverride(input: $input) {
      id
      roomTypeId
      startDate
      endDate
      rate
    }
  }
`;

const DELETE_RATE_OVERRIDE: TypedDocumentNode<DeleteRateOverrideMutationData, DeleteRateOverrideMutationVariables> = gql`
  mutation DeleteRateOverride($id: ID!) {
    deleteRateOverride(id: $id) {
      id
    }
  }
`;

export default function RatesPage() {
  const { currentProperty } = useProperty();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newOverride, setNewOverride] = useState({
    roomTypeId: '',
    startDate: '',
    endDate: '',
    rate: ''
  });

  const { data: rtData, loading: rtLoading } = useQuery(GET_ROOM_TYPES, {
    variables: { propertyId: currentProperty?.id || '' },
    skip: !currentProperty?.id,
  });

  const { data: ovData, loading: ovLoading, refetch: refetchOverrides } = useQuery(GET_RATE_OVERRIDES, {
    skip: !currentProperty?.id,
  });

  const [createOverride] = useMutation(CREATE_RATE_OVERRIDE);
  const [deleteOverrideMut] = useMutation(DELETE_RATE_OVERRIDE);

  const roomTypes = rtData?.roomTypes || [];
  const overrides = ovData?.rateOverrides || [];
  const loading = rtLoading || ovLoading;

  const handleCreateOverride = async () => {
    if (!newOverride.roomTypeId || !newOverride.startDate || !newOverride.endDate || !newOverride.rate || !currentProperty) return;

    setIsSubmitting(true);
    try {
      await createOverride({
        variables: {
          input: {
            roomTypeId: newOverride.roomTypeId,
            startDate: newOverride.startDate,
            endDate: newOverride.endDate,
            rate: parseFloat(newOverride.rate)
          }
        }
      });
      await refetchOverrides();
      setNewOverride({
        roomTypeId: '',
        startDate: '',
        endDate: '',
        rate: ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteOverride = async (id: string) => {
    try {
      await deleteOverrideMut({
        variables: { id }
      });
      await refetchOverrides();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium text-sm">Syncing revenue data...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Revenue Manager</h1>
        <p className="text-muted-foreground text-sm font-medium">Configure price overrides for seasons, holidays, and high-demand events.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Form */}
        <Card className="lg:col-span-1 border-none shadow-xl bg-card relative overflow-hidden rounded-[2rem]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase tracking-tight">Set Seasonal Rate</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Target a specific room type and date range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Room Type</Label>
              <select 
                className="w-full h-12 rounded-2xl border bg-slate-50 px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
                value={newOverride.roomTypeId}
                onChange={e => setNewOverride({...newOverride, roomTypeId: e.target.value})}
              >
                <option value="">Select a type...</option>
                {roomTypes.map((t: GqlRoomType) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Start Date</Label>
                <div className="relative">
                  <Input 
                    type="date"
                    value={newOverride.startDate}
                    onChange={e => setNewOverride({...newOverride, startDate: e.target.value})}
                    className="pl-10 rounded-2xl h-12 bg-slate-50 border-none font-bold"
                  />
                  <CalendarIcon className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">End Date</Label>
                <div className="relative">
                  <Input 
                    type="date"
                    value={newOverride.endDate}
                    onChange={e => setNewOverride({...newOverride, endDate: e.target.value})}
                    className="pl-10 rounded-2xl h-12 bg-slate-50 border-none font-bold"
                  />
                  <CalendarIcon className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Special Rate (₹)</Label>
              <div className="relative">
                <Input 
                  type="number"
                  placeholder="e.g. 5000"
                  value={newOverride.rate}
                  onChange={e => setNewOverride({...newOverride, rate: e.target.value})}
                  className="pl-10 rounded-2xl h-12 bg-slate-50 border-none font-bold"
                />
                <Tag className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <Button 
              className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] gap-2 mt-4 shadow-xl shadow-primary/20" 
              onClick={handleCreateOverride}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              Apply Rate Override
            </Button>
          </CardContent>
        </Card>

        {/* Existing Overrides List */}
        <Card className="lg:col-span-2 border-none shadow-xl bg-card/60 backdrop-blur-lg rounded-[2rem]">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase tracking-tight">Active & Future Overrides</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Scheduled price adjustments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AnimatePresence>
                {overrides.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <TrendingUp className="h-12 w-12 mx-auto opacity-20 mb-4" />
                    <p className="font-black uppercase tracking-widest text-[11px]">No rate overrides scheduled</p>
                  </div>
                ) : (
                  overrides.sort((a: GqlRateOverride, b: GqlRateOverride) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map((ov: GqlRateOverride) => {
                    const roomType = ov.RoomType;
                    return (
                      <motion.div
                        key={ov.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center justify-between p-5 bg-white rounded-[1.5rem] border border-slate-100 hover:border-primary/30 transition-all group shadow-sm"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg rotate-2">
                            <Tag className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="font-black text-slate-900 tracking-tight">{roomType?.name || 'Unknown Type'}</div>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary mt-1 bg-primary/5 px-2 py-0.5 rounded-lg w-fit">
                              <span>{format(new Date(ov.startDate), 'dd MMM')}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>{format(new Date(ov.endDate), 'dd MMM')}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-2xl font-black text-slate-900">₹{Number(ov.rate).toLocaleString()}</div>
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest rounded-lg border-primary/20 text-primary">
                              {ov.rate > (roomType?.defaultPrice || 0) ? '↑ Seasonal High' : '↓ Discounted'}
                            </Badge>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteOverride(ov.id)}
                            className="h-12 w-12 rounded-2xl text-slate-300 hover:text-destructive hover:bg-destructive/5 transition-all"
                          >
                            <Trash2 className="h-5 w-5" />
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
