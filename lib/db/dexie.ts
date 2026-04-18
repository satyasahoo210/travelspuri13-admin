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
  housekeepingStatus: 'READY' | 'DIRTY' | 'CLEANING' | 'INSPECTING';
  priorityCleaning: boolean;
  lastCleaned?: number;
  updatedAt: number;
}

export interface Guest {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  companyName?: string;
  gstin?: string;
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

export interface RoomType {
  id: string;
  propertyId: string;
  name: string;
  baseRate: number;
  capacity: number;
  description?: string;
  updatedAt: number;
}

export interface FolioItem {
  id: string;
  bookingId: string;
  propertyId: string;
  description: string;
  amount: number;
  type: 'ROOM_CHARGE' | 'FB' | 'LAUNDRY' | 'AD_HOC' | 'TAX' | 'PAYMENT';
  updatedAt: number;
}

export interface RateOverride {
  id: string;
  roomTypeId: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  rate: number;
  updatedAt: number;
}

export interface PropertySetting {
  id: string; // propertyId
  taxRate: number;
  currency: string;
  updatedAt: number;
}

export interface SyncQueueItem {
  id?: number;
  entity: 'bookings' | 'rooms' | 'guests' | 'payments' | 'roomTypes' | 'folioItems' | 'rateOverrides' | 'propertySettings';
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
  roomTypes!: Table<RoomType>;
  folioItems!: Table<FolioItem>;
  rateOverrides!: Table<RateOverride>;
  propertySettings!: Table<PropertySetting>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('pms_db');
    this.version(2).stores({
      bookings: 'id, guestId, propertyId, tenantId, status, checkInDate, updatedAt',
      rooms: 'id, roomTypeId, status, updatedAt',
      guests: 'id, name, phone, email, updatedAt',
      payments: 'id, bookingId, status, updatedAt',
      roomTypes: 'id, propertyId, updatedAt',
      folioItems: 'id, bookingId, propertyId, type, updatedAt',
      rateOverrides: 'id, roomTypeId, updatedAt',
      propertySettings: 'id, updatedAt',
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
