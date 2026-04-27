import { createClient } from '../utils/supabase/client';
import { db, Booking } from '../db/dexie';

const supabase = createClient();

export const bookingApi = {
  // Pull sync bookings
  sync: async (lastSyncedAt: number) => {
    const { data, error } = await supabase
      .from('Booking')
      .select('*, bookingRooms:BookingRoom(*)')
      .gt('updatedAt', new Date(lastSyncedAt).toISOString());

    if (error) throw error;
    return { data, timestamp: Date.now() };
  },

  // Create booking (Backend)
  create: async (bookingData: any) => {
    // Note: In a real app, you might need to handle bookingRooms separately 
    // or via a Supabase function if it's complex.
    const { data, error } = await supabase
      .from('Booking')
      .insert([bookingData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update booking (Backend)
  update: async (id: string, bookingData: any) => {
    const { data, error } = await supabase
      .from('Booking')
      .update(bookingData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
