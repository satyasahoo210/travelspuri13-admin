import Dexie, { Table } from 'dexie';

export interface Booking {
  id: string;
  guestId: string;
  propertyId: string;
  tenantId: string;
  checkInDate: Date;
  checkOutDate: Date;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW';
  source: 'DIRECT' | 'OTA' | 'BOOKING_ENGINE';
  roomTypeId: string;
  totalAmount: number;
  synced: 0 | 1;
  updatedAt: number; // For last-write-wins
}

export interface Room {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'OCCUPIED' | 'DIRTY';
  updatedAt: number;
}

export interface Guest {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  updatedAt: number;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  method: string;
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'REFUNDED';
  updatedAt: number;
}

export interface SyncQueueItem {
  id?: number;
  entity: 'bookings' | 'rooms' | 'guests' | 'payments';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export class PmsDatabase extends Dexie {
  bookings!: Table<Booking>;
  rooms!: Table<Room>;
  guests!: Table<Guest>;
  payments!: Table<Payment>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('pms_db');
    this.version(1).stores({
      bookings: 'id, guestId, propertyId, tenantId, status, checkInDate, updatedAt',
      rooms: 'id, roomTypeId, status, updatedAt',
      guests: 'id, name, phone, email, updatedAt',
      payments: 'id, bookingId, status, updatedAt',
      syncQueue: '++id, entity, entityId, timestamp'
    });
  }
}

export const db = new PmsDatabase();

// Helper to save last sync timestamp
export const getLastSyncTimestamp = async (entity: string) => {
  return Number(localStorage.getItem(`lastSync_${entity}`) || 0);
};

export const setLastSyncTimestamp = (entity: string, timestamp: number) => {
  localStorage.setItem(`lastSync_${entity}`, timestamp.toString());
};
