import { apiClient } from './client';

export const roomApi = {
  sync: async (lastSyncedAt: number) => {
    const response = await apiClient.get(`/room/sync`, {
      params: { since: lastSyncedAt }
    });
    return response.data;
  },
  
  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/room/${id}/status`, { status });
    return response.data;
  }
};

export const guestApi = {
  sync: async (lastSyncedAt: number) => {
    const response = await apiClient.get(`/guest/sync`, {
      params: { since: lastSyncedAt }
    });
    return response.data;
  },
  
  create: async (guestData: any) => {
    const response = await apiClient.post('/guest', guestData);
    return response.data;
  }
};

export const paymentApi = {
  sync: async (lastSyncedAt: number) => {
    const response = await apiClient.get(`/billing/sync`, {
      params: { since: lastSyncedAt }
    });
    return response.data;
  },
  
  record: async (paymentData: any) => {
    const response = await apiClient.post('/billing/payment', paymentData);
    return response.data;
  }
};
