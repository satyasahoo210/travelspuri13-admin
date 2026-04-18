import { db, Room } from './dexie';

export async function seedDatabase() {
  const propertyId = 'p1';

  // Seed Property settings
  await db.propertySettings.put({
    id: propertyId,
    taxRate: 12, // 12% GST
    currency: 'INR',
    updatedAt: Date.now()
  });

  // Seed Room Types
  await db.roomTypes.bulkPut([
    { id: 'deluxe', propertyId, name: 'Deluxe Room', baseRate: 3500, capacity: 2, updatedAt: Date.now() },
    { id: 'suite', propertyId, name: 'Executive Suite', baseRate: 7500, capacity: 3, updatedAt: Date.now() },
    { id: 'standard', propertyId, name: 'Standard Twin', baseRate: 2200, capacity: 2, updatedAt: Date.now() },
  ]);

  const rooms: Room[] = [
    { id: 'r1', roomNumber: '101', roomTypeId: 'deluxe', status: 'AVAILABLE', housekeepingStatus: 'READY', priorityCleaning: false, updatedAt: Date.now() },
    { id: 'r2', roomNumber: '102', roomTypeId: 'deluxe', status: 'OCCUPIED', housekeepingStatus: 'READY', priorityCleaning: false, updatedAt: Date.now() },
    { id: 'r3', roomNumber: '103', roomTypeId: 'suite', status: 'DIRTY', housekeepingStatus: 'DIRTY', priorityCleaning: true, updatedAt: Date.now() },
    { id: 'r4', roomNumber: '201', roomTypeId: 'standard', status: 'AVAILABLE', housekeepingStatus: 'CLEANING', priorityCleaning: false, updatedAt: Date.now() },
    { id: 'r5', roomNumber: '202', roomTypeId: 'standard', status: 'MAINTENANCE', housekeepingStatus: 'INSPECTING', priorityCleaning: false, updatedAt: Date.now() },
    { id: 'r6', roomNumber: '203', roomTypeId: 'standard', status: 'AVAILABLE', housekeepingStatus: 'READY', priorityCleaning: false, updatedAt: Date.now() },
  ];

  await db.rooms.bulkPut(rooms);

  const bookingId = 'b1';
  await db.bookings.bulkPut([
    {
      id: bookingId,
      guestId: 'g1',
      tenantId: 't1',
      propertyId,
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000 * 2),
      status: 'CONFIRMED',
      source: 'DIRECT',
      roomTypeId: 'standard',
      totalAmount: 4400, // 2200 * 2
      synced: 1,
      updatedAt: Date.now()
    }
  ]);

  // Seed Folio Items for the existing booking
  await db.folioItems.bulkPut([
    { id: 'f1', bookingId, propertyId, description: 'Room Charge - 2 Nights', amount: 4400, type: 'ROOM_CHARGE', updatedAt: Date.now() },
    { id: 'f2', bookingId, propertyId, description: 'GST (12%)', amount: 528, type: 'TAX', updatedAt: Date.now() },
    { id: 'f3', bookingId, propertyId, description: 'Restaurant - Dinner', amount: 850, type: 'FB', updatedAt: Date.now() },
    { id: 'f4', bookingId, propertyId, description: 'Laundry - Express', amount: 300, type: 'LAUNDRY', updatedAt: Date.now() },
    { id: 'f5', bookingId, propertyId, description: 'Mini Bar - Water', amount: 60, type: 'AD_HOC', updatedAt: Date.now() },
  ]);

  console.log('Database seeded with Financial data!');
}
