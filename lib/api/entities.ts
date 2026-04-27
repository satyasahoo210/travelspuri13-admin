import { apiClient } from './client';

export const roomApi = {
  sync: async (lastSyncedAt: number) => {
    const response = await apiClient.get(`/rooms/sync`, {
      params: { since: lastSyncedAt }
    });
    return response.data;
  },
  
  create: async (roomData: any) => {
    const response = await apiClient.post('/rooms', roomData);
    return response.data;
  },

  update: async (id: string, roomData: any) => {
    const response = await apiClient.patch(`/rooms/${id}`, roomData);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/rooms/${id}/status`, { status });
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
  },

  update: async (id: string, guestData: any) => {
    const response = await apiClient.patch(`/guest/${id}`, guestData);
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
  },

  create: async (paymentData: any) => {
    const response = await apiClient.post('/billing/payment', paymentData);
    return response.data;
  },

  update: async (id: string, paymentData: any) => {
    const response = await apiClient.patch(`/billing/payment/${id}`, paymentData);
    return response.data;
  }
};
export const roomTypeApi = {
  sync: async (lastSyncedAt: number) => {
    const response = await apiClient.get(`/rooms/room-types/sync`, {
      params: { since: lastSyncedAt }
    });
    return response.data;
  },
  
  create: async (roomTypeData: any) => {
    // Map baseRate to defaultPrice for backend
    const data = {
      ...roomTypeData,
      defaultPrice: roomTypeData.baseRate
    };
    const response = await apiClient.post('/rooms/room-type', data);
    return response.data;
  },

  update: async (id: string, roomTypeData: any) => {
    const data = {
      ...roomTypeData,
      defaultPrice: roomTypeData.baseRate
    };
    const response = await apiClient.patch(`/rooms/room-type/${id}`, data);
    return response.data;
  }
};
