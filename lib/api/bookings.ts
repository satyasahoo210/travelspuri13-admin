import { apiClient } from './client';
import { db, Booking } from '../db/dexie';

export const bookingApi = {
  // Pull sync bookings
  sync: async (lastSyncedAt: number) => {
    const response = await apiClient.get(`/booking/sync`, {
      params: { since: lastSyncedAt }
    });
    return response.data; // Expecting { bookings: Booking[], timestamp: number }
  },

  // Create booking (Backend)
  create: async (bookingData: any) => {
    const response = await apiClient.post('/booking', bookingData);
    return response.data;
  },

  // Update booking (Backend)
  update: async (id: string, bookingData: any) => {
    const response = await apiClient.patch(`/booking/${id}`, bookingData);
    return response.data;
  },
};
