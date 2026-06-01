import { Tables } from '@/database.types';
import { createClient } from '../utils/supabase/client';

const supabase = createClient();

export const roomApi = {
  sync: async (lastSyncedAt: number) => {
    const { data, error } = await supabase
      .from('Room')
      .select('*')
      .gt('updatedAt', new Date(lastSyncedAt).toISOString());
    
    if (error) throw error;
    return { data, timestamp: Date.now() };
  },
  
  create: async (roomData: any) => {
    const { data, error } = await supabase
      .from('Room')
      .insert([roomData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, roomData: any) => {
    const { data, error } = await supabase
      .from('Room')
      .update(roomData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateStatus: async (id: string, status: Tables<'Room'>['housekeepingStatus']) => {
    const { data, error } = await supabase
      .from('Room')
      .update({ housekeepingStatus: status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

export const guestApi = {
  sync: async (lastSyncedAt: number) => {
    const { data, error } = await supabase
      .from('Guest')
      .select('*')
      .gt('updatedAt', new Date(lastSyncedAt).toISOString());
    
    if (error) throw error;
    return { data, timestamp: Date.now() };
  },
  
  create: async (guestData: any) => {
    const { data, error } = await supabase
      .from('Guest')
      .insert([guestData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, guestData: any) => {
    const { data, error } = await supabase
      .from('Guest')
      .update(guestData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

export const paymentApi = {
  sync: async (lastSyncedAt: number) => {
    const { data, error } = await supabase
      .from('Payment')
      .select('*')
      .gt('updatedAt', new Date(lastSyncedAt).toISOString());
    
    if (error) throw error;
    return { data, timestamp: Date.now() };
  },
  
  record: async (paymentData: any) => {
    const { data, error } = await supabase
      .from('Payment')
      .insert([paymentData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  create: async (paymentData: any) => {
    const { data, error } = await supabase
      .from('Payment')
      .insert([paymentData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, paymentData: any) => {
    const { data, error } = await supabase
      .from('Payment')
      .update(paymentData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

export const roomTypeApi = {
  sync: async (lastSyncedAt: number) => {
    const { data, error } = await supabase
      .from('RoomType')
      .select('*')
      .gt('updatedAt', new Date(lastSyncedAt).toISOString());
    
    if (error) throw error;
    return { data, timestamp: Date.now() };
  },
  
  create: async (roomTypeData: any) => {
    // Map baseRate to defaultPrice for backend
    const { baseRate, ...rest } = roomTypeData;
    const { data, error } = await supabase
      .from('RoomType')
      .insert([{
        ...rest,
        defaultPrice: baseRate
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: string, roomTypeData: any) => {
    const { baseRate, ...rest } = roomTypeData;
    const { data, error } = await supabase
      .from('RoomType')
      .update({
        ...rest,
        defaultPrice: baseRate
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};
