import { bookingApi } from '../api/bookings';
import { guestApi, paymentApi, roomApi, roomTypeApi } from '../api/entities';
import { Booking, db, getLastSyncTimestamp, Guest, Payment, Room, setLastSyncTimestamp } from '../db/dexie';

const ENTITIES = ['bookings', 'rooms', 'guests', 'payments', 'roomTypes'] as const;

export class SyncManager {
  private static isSyncing = false;

  static async syncAll() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    console.log('🔄 Sync started...');

    try {
      await this.pushLocalChanges();
      await this.pullRemoteChanges();
      console.log('✅ Sync completed successfully.');
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private static async pushLocalChanges() {
    const queue = await db.syncQueue.orderBy('timestamp').toArray();
    
    for (const item of queue) {
      try {
        let response;
        const apiMap: Record<string, any> = {
          bookings: bookingApi,
          rooms: roomApi,
          guests: guestApi,
          payments: paymentApi,
          roomTypes: roomTypeApi,
        };

        const api = apiMap[item.entity];
        if (api) {
          if (item.action === 'create') response = await api.create(item.data);
          else if (item.action === 'update') response = await api.update(item.entityId, item.data);
          else if (item.action === 'delete' && api.delete) response = await api.delete(item.entityId);
        }
        
        // If success, remove from queue
        if (item.id) await db.syncQueue.delete(item.id);
      } catch (error) {
        console.error(`Failed to push ${item.entity} ${item.entityId}:`, error);
        // Stop pushing for now to maintain order for this entity if needed
        break; 
      }
    }
  }

  private static async pullRemoteChanges() {
    for (const entity of ENTITIES) {
      const lastSynced = await getLastSyncTimestamp(entity);
      let api;
      switch (entity) {
        case 'bookings': api = bookingApi; break;
        case 'rooms': api = roomApi; break;
        case 'guests': api = guestApi; break;
        case 'payments': api = paymentApi; break;
        case 'roomTypes': api = roomTypeApi; break;
      }

      if (api) {
        const { data, timestamp } = await api.sync(lastSynced);
        
        // Batch merge into Dexie
        await db.transaction('rw', db[entity], async () => {
          for (const item of data) {
            const local = await (db[entity] as any).get(item.id);
            if (!local || item.updatedAt > local.updatedAt) {
              await (db[entity] as any).put(item);
            }
          }
        });

        setLastSyncTimestamp(entity, timestamp);
      }
    }
  }
}
