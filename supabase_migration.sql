-- ENUMS
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'PROPERTY_MANAGER', 'STAFF');
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'MAINTENANCE', 'OCCUPIED', 'DIRTY');
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "BookingSource" AS ENUM ('DIRECT', 'OTA', 'BOOKING_ENGINE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'REFUNDED');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- TABLES

-- Tenant
CREATE TABLE "Tenant" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE,
    "featureFlags" JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- User (Linked to Supabase Auth)
CREATE TABLE "User" (
    "id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "email" TEXT UNIQUE NOT NULL,
    "name" TEXT,
    "role" "UserRole" DEFAULT 'STAFF',
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- Property
CREATE TABLE "Property" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "taxPercentage" DOUBLE PRECISION DEFAULT 0, -- DEPRECATED: Use settings->>'taxAmount'
    "checkInTime" TIME DEFAULT '08:00', -- DEPRECATED: Use settings->>'checkinTime'
    "checkOutTime" TIME DEFAULT '07:00', -- DEPRECATED: Use settings->>'checkoutTime'
    "logoUrl" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- UserProperty (Join Table)
CREATE TABLE "UserProperty" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "propertyId" UUID NOT NULL REFERENCES "Property"("id") ON DELETE CASCADE,
    UNIQUE("userId", "propertyId")
);

-- RoomType
CREATE TABLE "RoomType" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "defaultPrice" DECIMAL(10, 2) DEFAULT 0,
    "propertyId" UUID NOT NULL REFERENCES "Property"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- Room
CREATE TABLE "Room" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomNumber" TEXT NOT NULL,
    "status" "RoomStatus" DEFAULT 'AVAILABLE',
    "roomTypeId" UUID NOT NULL REFERENCES "RoomType"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    UNIQUE("roomTypeId", "roomNumber")
);

-- Inventory
CREATE TABLE "Inventory" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomTypeId" UUID NOT NULL REFERENCES "RoomType"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "date" TIMESTAMPTZ NOT NULL,
    "totalRooms" INTEGER NOT NULL,
    "availableRooms" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    UNIQUE("roomTypeId", "date")
);

-- Guest
CREATE TABLE "Guest" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "idProofType" TEXT,
    "idProofNumber" TEXT,
    "idProofUrl" TEXT,
    "gstin" TEXT,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- Booking
CREATE TABLE "Booking" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "guestId" UUID NOT NULL REFERENCES "Guest"("id") ON DELETE CASCADE,
    "propertyId" UUID NOT NULL REFERENCES "Property"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "source" "BookingSource" DEFAULT 'DIRECT',
    "status" "BookingStatus" DEFAULT 'CONFIRMED',
    "checkInDate" TIMESTAMPTZ NOT NULL,
    "checkOutDate" TIMESTAMPTZ NOT NULL,
    "adults" INTEGER DEFAULT 1,
    "children" INTEGER DEFAULT 0,
    "discountAmount" DECIMAL(10, 2) DEFAULT 0,
    "discountType" TEXT DEFAULT 'FIXED', -- 'FIXED' or 'PERCENTAGE'
    "totalAmount" DECIMAL(10, 2),
    "waiveLastDayCharge" BOOLEAN DEFAULT FALSE,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- BookingRoom (Assignments)
CREATE TABLE "BookingRoom" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "bookingId" UUID NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE,
    "roomTypeId" UUID NOT NULL REFERENCES "RoomType"("id") ON DELETE CASCADE,
    "roomId" UUID REFERENCES "Room"("id") ON DELETE SET NULL,
    "quantity" INTEGER DEFAULT 1,
    "priceOverride" DECIMAL(10, 2),
    "status" "BookingStatus" DEFAULT 'CONFIRMED',
    "checkInDate" TIMESTAMPTZ,
    "checkOutDate" TIMESTAMPTZ
);

-- Service
CREATE TABLE "Service" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10, 2) NOT NULL,
    "propertyId" UUID NOT NULL REFERENCES "Property"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- BookingService
CREATE TABLE "BookingService" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "bookingId" UUID NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE,
    "serviceId" UUID NOT NULL REFERENCES "Service"("id") ON DELETE CASCADE,
    "quantity" INTEGER DEFAULT 1,
    "totalPrice" DECIMAL(10, 2) NOT NULL
);

-- Billing
CREATE TABLE "Billing" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "bookingId" UUID UNIQUE NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "totalAmount" DECIMAL(10, 2) NOT NULL,
    "taxAmount" DECIMAL(10, 2) NOT NULL,
    "paymentStatus" "PaymentStatus" DEFAULT 'PENDING',
    "currency" TEXT DEFAULT 'INR',
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- Payment
CREATE TABLE "Payment" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "bookingId" UUID NOT NULL REFERENCES "Booking"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "amount" DECIMAL(10, 2) NOT NULL,
    "method" TEXT NOT NULL,
    "status" "PaymentStatus" DEFAULT 'PAID',
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- Expense
CREATE TABLE "Expense" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL REFERENCES "Property"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "amount" DECIMAL(10, 2) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMPTZ DEFAULT now(),
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Pricing
CREATE TABLE "Pricing" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomTypeId" UUID NOT NULL REFERENCES "RoomType"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "date" TIMESTAMPTZ NOT NULL,
    "basePrice" DECIMAL(10, 2) NOT NULL,
    "seasonalModifier" DOUBLE PRECISION DEFAULT 1.0,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now(),
    UNIQUE("roomTypeId", "date")
);

-- Product (F&B)
CREATE TABLE "Product" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(10, 2) NOT NULL,
    "propertyId" UUID NOT NULL REFERENCES "Property"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- Order (F&B)
CREATE TABLE "Order" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL REFERENCES "Property"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "bookingId" UUID REFERENCES "Booking"("id") ON DELETE SET NULL,
    "tableNumber" TEXT,
    "status" "OrderStatus" DEFAULT 'PENDING',
    "totalAmount" DECIMAL(10, 2) NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- OrderItem
CREATE TABLE "OrderItem" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "productId" UUID NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10, 2) NOT NULL
);

-- StockItem
CREATE TABLE "StockItem" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER DEFAULT 0,
    "unit" TEXT NOT NULL,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- Supplier
CREATE TABLE "Supplier" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- Employee (HRMS)
CREATE TABLE "Employee" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- Attendance
CREATE TABLE "Attendance" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "employeeId" UUID NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "date" DATE NOT NULL,
    "checkIn" TIMESTAMPTZ,
    "checkOut" TIMESTAMPTZ,
    "status" TEXT NOT NULL
);

-- Leave
CREATE TABLE "Leave" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "employeeId" UUID NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "startDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ NOT NULL,
    "status" "LeaveStatus" DEFAULT 'PENDING',
    "reason" TEXT
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX "idx_tenant_name" ON "Tenant"("name");
CREATE INDEX "idx_user_tenant" ON "User"("tenantId");
CREATE INDEX "idx_property_tenant" ON "Property"("tenantId");
CREATE INDEX "idx_room_type_property" ON "RoomType"("propertyId");
CREATE INDEX "idx_room_type_lookup" ON "Room"("roomTypeId", "status");
CREATE INDEX "idx_inventory_date_tenant" ON "Inventory"("date", "tenantId");
CREATE INDEX "idx_guest_tenant_name" ON "Guest"("tenantId", "name");
CREATE INDEX "idx_guest_phone" ON "Guest"("phone");
CREATE INDEX "idx_booking_tenant_status" ON "Booking"("tenantId", "status");
CREATE INDEX "idx_booking_property_dates" ON "Booking"("propertyId", "checkInDate", "checkOutDate");
CREATE INDEX "idx_booking_room_lookup" ON "BookingRoom"("bookingId");
CREATE INDEX "idx_payment_booking" ON "Payment"("bookingId");
CREATE INDEX "idx_billing_booking" ON "Billing"("bookingId");
CREATE INDEX "idx_expense_tenant_date" ON "Expense"("tenantId", "date");
CREATE INDEX "idx_product_tenant_cat" ON "Product"("tenantId", "category");
CREATE INDEX "idx_order_tenant_status" ON "Order"("tenantId", "status");
CREATE INDEX "idx_order_booking" ON "Order"("bookingId");
CREATE INDEX "idx_stock_item_tenant" ON "StockItem"("tenantId");
CREATE INDEX "idx_employee_tenant" ON "Employee"("tenantId");
CREATE INDEX "idx_attendance_emp_date" ON "Attendance"("employeeId", "date");
CREATE INDEX "idx_leave_emp_status" ON "Leave"("employeeId", "status");

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserProperty" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Guest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingRoom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingService" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Billing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pricing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Leave" ENABLE ROW LEVEL SECURITY;

-- Helper function to get the current user's tenant_id
CREATE OR REPLACE FUNCTION get_auth_tenant() 
RETURNS uuid AS $$
  SELECT "tenantId" FROM "User" WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if the current user is a SUPER_ADMIN
CREATE OR REPLACE FUNCTION is_super_admin() 
RETURNS boolean AS $$
  SELECT role = 'SUPER_ADMIN' FROM "User" WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for Tenant (Only accessible if you belong to it OR are super_admin)
CREATE POLICY "tenant_access" ON "Tenant"
  USING (is_super_admin() OR id = get_auth_tenant());

-- Generic "tenant_id" based policies for all other tables
CREATE POLICY "user_tenant_isolation" ON "User"
  USING (is_super_admin() OR "tenantId" = get_auth_tenant());

CREATE POLICY "property_tenant_isolation" ON "Property"
  USING (is_super_admin() OR "tenantId" = get_auth_tenant());

CREATE POLICY "roomtype_tenant_isolation" ON "RoomType"
  USING (is_super_admin() OR EXISTS (SELECT 1 FROM "Property" p WHERE p.id = "propertyId" AND p."tenantId" = get_auth_tenant()));

CREATE POLICY "room_tenant_isolation" ON "Room"
  USING (is_super_admin() OR EXISTS (SELECT 1 FROM "RoomType" rt JOIN "Property" p ON rt."propertyId" = p.id WHERE rt.id = "roomTypeId" AND p."tenantId" = get_auth_tenant()));

CREATE POLICY "inventory_isolation" ON "Inventory" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "guest_isolation" ON "Guest" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "booking_isolation" ON "Booking" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "service_isolation" ON "Service" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "billing_isolation" ON "Billing" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "payment_isolation" ON "Payment" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "expense_isolation" ON "Expense" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "pricing_isolation" ON "Pricing" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "product_isolation" ON "Product" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "order_isolation" ON "Order" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "orderitem_isolation" ON "OrderItem" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "stockitem_isolation" ON "StockItem" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "supplier_isolation" ON "Supplier" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "employee_isolation" ON "Employee" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "attendance_isolation" ON "Attendance" USING (is_super_admin() OR "tenantId" = get_auth_tenant());
CREATE POLICY "leave_isolation" ON "Leave" USING (is_super_admin() OR "tenantId" = get_auth_tenant());

CREATE POLICY "bookingroom_isolation" ON "BookingRoom" 
  USING (is_super_admin() OR EXISTS (SELECT 1 FROM "Booking" b WHERE b.id = "bookingId" AND b."tenantId" = get_auth_tenant()));

CREATE POLICY "bookingservice_isolation" ON "BookingService" 
  USING (is_super_admin() OR EXISTS (SELECT 1 FROM "Booking" b WHERE b.id = "bookingId" AND b."tenantId" = get_auth_tenant()));

-- FUNCTIONS & TRIGGERS

-- Automatically update 'updatedAt' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with 'updatedAt'
CREATE TRIGGER update_tenant_updated_at BEFORE UPDATE ON "Tenant" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_property_updated_at BEFORE UPDATE ON "Property" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_room_type_updated_at BEFORE UPDATE ON "RoomType" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_room_updated_at BEFORE UPDATE ON "Room" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON "Inventory" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_guest_updated_at BEFORE UPDATE ON "Guest" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_booking_updated_at BEFORE UPDATE ON "Booking" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_service_updated_at BEFORE UPDATE ON "Service" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_billing_updated_at BEFORE UPDATE ON "Billing" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_payment_updated_at BEFORE UPDATE ON "Payment" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_pricing_updated_at BEFORE UPDATE ON "Pricing" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_product_updated_at BEFORE UPDATE ON "Product" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_order_updated_at BEFORE UPDATE ON "Order" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_stock_item_updated_at BEFORE UPDATE ON "StockItem" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_employee_updated_at BEFORE UPDATE ON "Employee" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- AUTOMATION: FOLIO FINANCIAL RECALCULATION
-- ==========================================
-- Calculates the live total amount of a booking
-- Sums: (assigned rooms * rate) + (posted services) - discount
CREATE OR REPLACE FUNCTION recalculate_booking_total()
RETURNS TRIGGER AS $$
DECLARE
    target_booking_id UUID;
    room_subtotal_nightly DECIMAL(10, 2) := 0;
    service_subtotal DECIMAL(10, 2) := 0;
    subtotal DECIMAL(10, 2) := 0;
    discount_val DECIMAL(10, 2) := 0;
    tax_val DECIMAL(10, 2) := 0;
    final_total DECIMAL(10, 2) := 0;
    nights INTEGER := 1;
    booking_record RECORD;
    tax_enabled BOOLEAN := TRUE;
    effective_tax_rate DECIMAL(10, 2);
    effective_checkout_time TIME;
BEGIN
    -- Determine the booking ID based on the table firing the trigger
    IF TG_TABLE_NAME = 'Booking' THEN
        target_booking_id := NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        target_booking_id := OLD."bookingId";
    ELSE
        target_booking_id := NEW."bookingId";
    END IF;

    -- Get booking details and linked property details
    SELECT b.*, p."taxPercentage", p."checkOutTime" as prop_checkout_time, p."settings" as prop_settings
    INTO booking_record
    FROM "Booking" b
    JOIN "Property" p ON b."propertyId" = p.id
    WHERE b.id = target_booking_id;

    -- Exit if booking not found
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Get settings from JSON (with fallbacks to columns)
    tax_enabled := COALESCE((booking_record.prop_settings->>'defaultTaxEnabled')::BOOLEAN, TRUE);
    
    -- Prefer settings taxAmount, fallback to property taxPercentage
    effective_tax_rate := COALESCE((booking_record.prop_settings->>'taxAmount')::DECIMAL, booking_record."taxPercentage", 0);
    
    -- Prefer settings checkoutTime, fallback to property checkOutTime
    effective_checkout_time := COALESCE((booking_record.prop_settings->>'checkoutTime')::TIME, booking_record.prop_checkout_time, '07:00:00'::TIME);

    -- Calculate nights logic
    -- 1. Base nights = calendar days difference
    nights := (booking_record."checkOutDate"::DATE - booking_record."checkInDate"::DATE);
    
    -- 2. If checkout time is after property's checkout time, add 1 night
    IF booking_record."checkOutDate"::TIME > effective_checkout_time THEN
        nights := nights + 1;
    END IF;

    -- 3. Apply waiver if enabled
    IF booking_record."waiveLastDayCharge" = TRUE THEN
        nights := nights - 1;
    END IF;

    -- 4. Minimum 1 night
    nights := GREATEST(1, nights);

    -- Calculate room subtotal (sum of nightly rates for all assigned rooms)
    SELECT COALESCE(SUM(COALESCE(br."priceOverride", rt."defaultPrice", 0)), 0)
    INTO room_subtotal_nightly
    FROM "BookingRoom" br
    LEFT JOIN "RoomType" rt ON br."roomTypeId" = rt.id
    WHERE br."bookingId" = target_booking_id;

    -- Calculate service subtotal (posted charges)
    SELECT COALESCE(SUM("totalPrice"), 0)
    INTO service_subtotal
    FROM "BookingService"
    WHERE "bookingId" = target_booking_id;

    -- Subtotal = (Room Charges * Nights) + Services
    subtotal := (room_subtotal_nightly * nights) + service_subtotal;

    -- Calculate discount amount
    IF booking_record."discountType" = 'PERCENTAGE' THEN
        discount_val := subtotal * (COALESCE(booking_record."discountAmount", 0) / 100);
    ELSE
        discount_val := COALESCE(booking_record."discountAmount", 0);
    END IF;

    -- Calculate tax
    IF tax_enabled THEN
        tax_val := (subtotal - discount_val) * (effective_tax_rate / 100.0);
    ELSE
        tax_val := 0;
    END IF;

    -- Final total calculation
    final_total := subtotal - discount_val + tax_val;

    -- Update the Booking table with the fresh total
    -- Note: Updating ONLY "totalAmount" avoids infinite loops with trigger_recalculate_total_b
    UPDATE "Booking"
    SET "totalAmount" = final_total
    WHERE id = target_booking_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for assignments changes (add/edit/remove room to folio)
CREATE TRIGGER trigger_recalculate_total_br
AFTER INSERT OR UPDATE OR DELETE ON "BookingRoom"
FOR EACH ROW EXECUTE PROCEDURE recalculate_booking_total();

-- Trigger for service ledger changes (post/edit/void charges)
CREATE TRIGGER trigger_recalculate_total_bs
AFTER INSERT OR UPDATE OR DELETE ON "BookingService"
FOR EACH ROW EXECUTE PROCEDURE recalculate_booking_total();

-- Trigger for master folio modifications (discounts)
CREATE TRIGGER trigger_recalculate_total_b
AFTER UPDATE OF "discountAmount", "discountType", "checkInDate", "checkOutDate", "waiveLastDayCharge" ON "Booking"
FOR EACH ROW WHEN (
    OLD."discountAmount" IS DISTINCT FROM NEW."discountAmount" OR 
    OLD."discountType" IS DISTINCT FROM NEW."discountType" OR
    OLD."checkInDate" IS DISTINCT FROM NEW."checkInDate" OR
    OLD."checkOutDate" IS DISTINCT FROM NEW."checkOutDate" OR
    OLD."waiveLastDayCharge" IS DISTINCT FROM NEW."waiveLastDayCharge"
)
EXECUTE PROCEDURE recalculate_booking_total();

-- Storage Buckets Configuration
-- Note: 'storage' schema must be available in the target database.

-- Properties Bucket (Public for Logos)
INSERT INTO storage.buckets (id, name, public) VALUES ('properties', 'properties', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access Properties Logos" ON storage.objects FOR SELECT USING (bucket_id = 'properties');
CREATE POLICY "Authenticated Upload Properties" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'properties' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Properties" ON storage.objects FOR UPDATE USING (bucket_id = 'properties' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete Properties" ON storage.objects FOR DELETE USING (bucket_id = 'properties' AND auth.role() = 'authenticated');

-- Guests Bucket (Private for ID Proofs)
INSERT INTO storage.buckets (id, name, public) VALUES ('guests', 'guests', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated Access Guests" ON storage.objects FOR SELECT USING (bucket_id = 'guests' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Upload Guests" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'guests' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Guests" ON storage.objects FOR UPDATE USING (bucket_id = 'guests' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete Guests" ON storage.objects FOR DELETE USING (bucket_id = 'guests' AND auth.role() = 'authenticated');


-- Migration for enhancements (May 2026)
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "grNumber" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "actualCheckOut" TIMESTAMPTZ;

-- Flexible Branding and Configuration (JSON-based)
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "settings" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "photos" TEXT[];

ALTER TABLE "RoomType" ADD COLUMN IF NOT EXISTS "photos" TEXT[];

ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "preferences" TEXT;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- ==========================================
-- MIGRATION: MAY 2026 - REAL-TIME FEATURES
-- ==========================================

-- 1. Housekeeping Enhancements
CREATE TYPE "HousekeepingStatus" AS ENUM ('READY', 'DIRTY', 'CLEANING', 'INSPECTING');
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "housekeepingStatus" "HousekeepingStatus" DEFAULT 'READY';
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "priorityCleaning" BOOLEAN DEFAULT FALSE;

-- 2. Rate Overrides (Seasonal Pricing)
CREATE TABLE IF NOT EXISTS "RateOverride" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomTypeId" UUID NOT NULL REFERENCES "RoomType"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "rate" DECIMAL(10, 2) NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 3. Guest Messaging Hub
CREATE TABLE IF NOT EXISTS "Message" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "bookingId" UUID REFERENCES "Booking"("id") ON DELETE CASCADE,
    "guestId" UUID NOT NULL REFERENCES "Guest"("id") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "direction" TEXT NOT NULL, -- 'INBOUND', 'OUTBOUND'
    "status" TEXT DEFAULT 'SENT', -- 'SENT', 'DELIVERED', 'READ'
    "channel" TEXT DEFAULT 'WHATSAPP',
    "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE "RateOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "rateoverride_isolation" ON "RateOverride" 
  USING (is_super_admin() OR "tenantId" = get_auth_tenant());

CREATE POLICY "message_isolation" ON "Message" 
  USING (is_super_admin() OR "tenantId" = get_auth_tenant());

-- 6. Triggers
CREATE TRIGGER update_rate_override_updated_at 
  BEFORE UPDATE ON "RateOverride" 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 7. Indexes
CREATE INDEX "idx_rate_override_roomtype" ON "RateOverride"("roomTypeId");
CREATE INDEX "idx_message_booking" ON "Message"("bookingId");
CREATE INDEX "idx_message_guest" ON "Message"("guestId");

