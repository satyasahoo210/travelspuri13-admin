export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      Attendance: {
        Row: {
          checkIn: string | null
          checkOut: string | null
          date: string
          employeeId: string
          id: string
          status: string
          tenantId: string
        }
        Insert: {
          checkIn?: string | null
          checkOut?: string | null
          date: string
          employeeId: string
          id?: string
          status: string
          tenantId: string
        }
        Update: {
          checkIn?: string | null
          checkOut?: string | null
          date?: string
          employeeId?: string
          id?: string
          status?: string
          tenantId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Attendance_employeeId_fkey"
            columns: ["employeeId"]
            isOneToOne: false
            referencedRelation: "Employee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Attendance_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Billing: {
        Row: {
          bookingId: string
          createdAt: string | null
          currency: string | null
          id: string
          paymentStatus: Database["public"]["Enums"]["PaymentStatus"] | null
          taxAmount: number
          tenantId: string
          totalAmount: number
          updatedAt: string | null
        }
        Insert: {
          bookingId: string
          createdAt?: string | null
          currency?: string | null
          id?: string
          paymentStatus?: Database["public"]["Enums"]["PaymentStatus"] | null
          taxAmount: number
          tenantId: string
          totalAmount: number
          updatedAt?: string | null
        }
        Update: {
          bookingId?: string
          createdAt?: string | null
          currency?: string | null
          id?: string
          paymentStatus?: Database["public"]["Enums"]["PaymentStatus"] | null
          taxAmount?: number
          tenantId?: string
          totalAmount?: number
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Billing_bookingId_fkey"
            columns: ["bookingId"]
            isOneToOne: true
            referencedRelation: "Booking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Billing_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Booking: {
        Row: {
          adults: number | null
          checkInDate: string
          checkOutDate: string
          children: number | null
          createdAt: string | null
          discountAmount: number | null
          discountType: string | null
          guestId: string
          id: string
          notes: string | null
          propertyId: string
          source: Database["public"]["Enums"]["BookingSource"] | null
          status: Database["public"]["Enums"]["BookingStatus"] | null
          tenantId: string
          totalAmount: number | null
          updatedAt: string | null
          waiveLastDayCharge: boolean | null
        }
        Insert: {
          adults?: number | null
          checkInDate: string
          checkOutDate: string
          children?: number | null
          createdAt?: string | null
          discountAmount?: number | null
          discountType?: string | null
          guestId: string
          id?: string
          notes?: string | null
          propertyId: string
          source?: Database["public"]["Enums"]["BookingSource"] | null
          status?: Database["public"]["Enums"]["BookingStatus"] | null
          tenantId: string
          totalAmount?: number | null
          updatedAt?: string | null
          waiveLastDayCharge?: boolean | null
        }
        Update: {
          adults?: number | null
          checkInDate?: string
          checkOutDate?: string
          children?: number | null
          createdAt?: string | null
          discountAmount?: number | null
          discountType?: string | null
          guestId?: string
          id?: string
          notes?: string | null
          propertyId?: string
          source?: Database["public"]["Enums"]["BookingSource"] | null
          status?: Database["public"]["Enums"]["BookingStatus"] | null
          tenantId?: string
          totalAmount?: number | null
          updatedAt?: string | null
          waiveLastDayCharge?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "Booking_guestId_fkey"
            columns: ["guestId"]
            isOneToOne: false
            referencedRelation: "Guest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Booking_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Booking_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      BookingRoom: {
        Row: {
          bookingId: string
          checkInDate: string | null
          checkOutDate: string | null
          id: string
          priceOverride: number | null
          quantity: number
          roomId: string | null
          roomTypeId: string
          status: Database["public"]["Enums"]["BookingStatus"] | null
        }
        Insert: {
          bookingId: string
          checkInDate?: string | null
          checkOutDate?: string | null
          id?: string
          priceOverride?: number | null
          quantity?: number
          roomId?: string | null
          roomTypeId: string
          status?: Database["public"]["Enums"]["BookingStatus"] | null
        }
        Update: {
          bookingId?: string
          checkInDate?: string | null
          checkOutDate?: string | null
          id?: string
          priceOverride?: number | null
          quantity?: number
          roomId?: string | null
          roomTypeId?: string
          status?: Database["public"]["Enums"]["BookingStatus"] | null
        }
        Relationships: [
          {
            foreignKeyName: "BookingRoom_bookingId_fkey"
            columns: ["bookingId"]
            isOneToOne: false
            referencedRelation: "Booking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BookingRoom_roomId_fkey"
            columns: ["roomId"]
            isOneToOne: false
            referencedRelation: "Room"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BookingRoom_roomTypeId_fkey"
            columns: ["roomTypeId"]
            isOneToOne: false
            referencedRelation: "RoomType"
            referencedColumns: ["id"]
          },
        ]
      }
      BookingService: {
        Row: {
          bookingId: string
          id: string
          quantity: number | null
          serviceId: string
          totalPrice: number
        }
        Insert: {
          bookingId: string
          id?: string
          quantity?: number | null
          serviceId: string
          totalPrice: number
        }
        Update: {
          bookingId?: string
          id?: string
          quantity?: number | null
          serviceId?: string
          totalPrice?: number
        }
        Relationships: [
          {
            foreignKeyName: "BookingService_bookingId_fkey"
            columns: ["bookingId"]
            isOneToOne: false
            referencedRelation: "Booking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "BookingService_serviceId_fkey"
            columns: ["serviceId"]
            isOneToOne: false
            referencedRelation: "Service"
            referencedColumns: ["id"]
          },
        ]
      }
      Employee: {
        Row: {
          createdAt: string | null
          id: string
          name: string
          role: string
          tenantId: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          id?: string
          name: string
          role: string
          tenantId: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          id?: string
          name?: string
          role?: string
          tenantId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Employee_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Expense: {
        Row: {
          amount: number
          category: string
          createdAt: string | null
          date: string | null
          description: string | null
          id: string
          propertyId: string
          tenantId: string
        }
        Insert: {
          amount: number
          category: string
          createdAt?: string | null
          date?: string | null
          description?: string | null
          id?: string
          propertyId: string
          tenantId: string
        }
        Update: {
          amount?: number
          category?: string
          createdAt?: string | null
          date?: string | null
          description?: string | null
          id?: string
          propertyId?: string
          tenantId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Expense_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Expense_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Guest: {
        Row: {
          address: string | null
          createdAt: string | null
          email: string | null
          id: string
          idProofNumber: string | null
          idProofType: string | null
          idProofUrl: string | null
          gstin: string | null
          name: string
          notes: string | null
          phone: string | null
          preferences: string | null
          tenantId: string
          updatedAt: string | null
        }
        Insert: {
          address?: string | null
          createdAt?: string | null
          email?: string | null
          id?: string
          idProofNumber?: string | null
          idProofType?: string | null
          idProofUrl?: string | null
          gstin?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          preferences?: string | null
          tenantId: string
          updatedAt?: string | null
        }
        Update: {
          address?: string | null
          createdAt?: string | null
          email?: string | null
          id?: string
          idProofNumber?: string | null
          idProofType?: string | null
          idProofUrl?: string | null
          gstin?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          preferences?: string | null
          tenantId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Guest_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Inventory: {
        Row: {
          availableRooms: number
          createdAt: string | null
          date: string
          id: string
          roomTypeId: string
          tenantId: string
          totalRooms: number
          updatedAt: string | null
        }
        Insert: {
          availableRooms: number
          createdAt?: string | null
          date: string
          id?: string
          roomTypeId: string
          tenantId: string
          totalRooms: number
          updatedAt?: string | null
        }
        Update: {
          availableRooms?: number
          createdAt?: string | null
          date?: string
          id?: string
          roomTypeId?: string
          tenantId?: string
          totalRooms?: number
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Inventory_roomTypeId_fkey"
            columns: ["roomTypeId"]
            isOneToOne: false
            referencedRelation: "RoomType"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Inventory_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Leave: {
        Row: {
          employeeId: string
          endDate: string
          id: string
          reason: string | null
          startDate: string
          status: Database["public"]["Enums"]["LeaveStatus"] | null
          tenantId: string
        }
        Insert: {
          employeeId: string
          endDate: string
          id?: string
          reason?: string | null
          startDate: string
          status?: Database["public"]["Enums"]["LeaveStatus"] | null
          tenantId: string
        }
        Update: {
          employeeId?: string
          endDate?: string
          id?: string
          reason?: string | null
          startDate?: string
          status?: Database["public"]["Enums"]["LeaveStatus"] | null
          tenantId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Leave_employeeId_fkey"
            columns: ["employeeId"]
            isOneToOne: false
            referencedRelation: "Employee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Leave_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Order: {
        Row: {
          bookingId: string | null
          createdAt: string | null
          id: string
          propertyId: string
          status: Database["public"]["Enums"]["OrderStatus"] | null
          tableNumber: string | null
          tenantId: string
          totalAmount: number
          updatedAt: string | null
        }
        Insert: {
          bookingId?: string | null
          createdAt?: string | null
          id?: string
          propertyId: string
          status?: Database["public"]["Enums"]["OrderStatus"] | null
          tableNumber?: string | null
          tenantId: string
          totalAmount: number
          updatedAt?: string | null
        }
        Update: {
          bookingId?: string | null
          createdAt?: string | null
          id?: string
          propertyId?: string
          status?: Database["public"]["Enums"]["OrderStatus"] | null
          tableNumber?: string | null
          tenantId?: string
          totalAmount?: number
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Order_bookingId_fkey"
            columns: ["bookingId"]
            isOneToOne: false
            referencedRelation: "Booking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Order_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Order_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      OrderItem: {
        Row: {
          id: string
          orderId: string
          price: number
          productId: string
          quantity: number
          tenantId: string
        }
        Insert: {
          id?: string
          orderId: string
          price: number
          productId: string
          quantity: number
          tenantId: string
        }
        Update: {
          id?: string
          orderId?: string
          price?: number
          productId?: string
          quantity?: number
          tenantId?: string
        }
        Relationships: [
          {
            foreignKeyName: "OrderItem_orderId_fkey"
            columns: ["orderId"]
            isOneToOne: false
            referencedRelation: "Order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "OrderItem_productId_fkey"
            columns: ["productId"]
            isOneToOne: false
            referencedRelation: "Product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "OrderItem_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Payment: {
        Row: {
          amount: number
          bookingId: string
          createdAt: string | null
          id: string
          method: string
          status: Database["public"]["Enums"]["PaymentStatus"] | null
          tenantId: string
          updatedAt: string | null
        }
        Insert: {
          amount: number
          bookingId: string
          createdAt?: string | null
          id?: string
          method: string
          status?: Database["public"]["Enums"]["PaymentStatus"] | null
          tenantId: string
          updatedAt?: string | null
        }
        Update: {
          amount?: number
          bookingId?: string
          createdAt?: string | null
          id?: string
          method?: string
          status?: Database["public"]["Enums"]["PaymentStatus"] | null
          tenantId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Payment_bookingId_fkey"
            columns: ["bookingId"]
            isOneToOne: false
            referencedRelation: "Booking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Payment_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Pricing: {
        Row: {
          basePrice: number
          createdAt: string | null
          date: string
          id: string
          roomTypeId: string
          seasonalModifier: number | null
          tenantId: string
          updatedAt: string | null
        }
        Insert: {
          basePrice: number
          createdAt?: string | null
          date: string
          id?: string
          roomTypeId: string
          seasonalModifier?: number | null
          tenantId: string
          updatedAt?: string | null
        }
        Update: {
          basePrice?: number
          createdAt?: string | null
          date?: string
          id?: string
          roomTypeId?: string
          seasonalModifier?: number | null
          tenantId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Pricing_roomTypeId_fkey"
            columns: ["roomTypeId"]
            isOneToOne: false
            referencedRelation: "RoomType"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Pricing_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Product: {
        Row: {
          category: string
          createdAt: string | null
          id: string
          name: string
          price: number
          propertyId: string
          tenantId: string
          updatedAt: string | null
        }
        Insert: {
          category: string
          createdAt?: string | null
          id?: string
          name: string
          price: number
          propertyId: string
          tenantId: string
          updatedAt?: string | null
        }
        Update: {
          category?: string
          createdAt?: string | null
          id?: string
          name?: string
          price?: number
          propertyId?: string
          tenantId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Product_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Product_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Property: {
        Row: {
          address: string
          checkInTime: string | null
          checkOutTime: string | null
          createdAt: string | null
          email: string | null
          id: string
          logoUrl: string | null
          name: string
          phone: string | null
          photos: string[] | null
          settings: Json | null
          taxPercentage: number | null
          tenantId: string
          timezone: string
          updatedAt: string | null
        }
        Insert: {
          address: string
          checkInTime?: string | null
          checkOutTime?: string | null
          createdAt?: string | null
          email?: string | null
          id?: string
          logoUrl?: string | null
          name: string
          phone?: string | null
          photos?: string[] | null
          settings?: Json | null
          taxPercentage?: number | null
          tenantId: string
          timezone: string
          updatedAt?: string | null
        }
        Update: {
          address?: string
          checkInTime?: string | null
          checkOutTime?: string | null
          createdAt?: string | null
          email?: string | null
          id?: string
          logoUrl?: string | null
          name?: string
          phone?: string | null
          photos?: string[] | null
          settings?: Json | null
          taxPercentage?: number | null
          tenantId?: string
          timezone?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Property_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Room: {
        Row: {
          createdAt: string | null
          id: string
          roomNumber: string
          roomTypeId: string
          status: Database["public"]["Enums"]["RoomStatus"] | null
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          id?: string
          roomNumber: string
          roomTypeId: string
          status?: Database["public"]["Enums"]["RoomStatus"] | null
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          id?: string
          roomNumber?: string
          roomTypeId?: string
          status?: Database["public"]["Enums"]["RoomStatus"] | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Room_roomTypeId_fkey"
            columns: ["roomTypeId"]
            isOneToOne: false
            referencedRelation: "RoomType"
            referencedColumns: ["id"]
          },
        ]
      }
      RoomType: {
        Row: {
          capacity: number
          createdAt: string | null
          defaultPrice: number | null
          id: string
          name: string
          photos: string[] | null
          propertyId: string
          updatedAt: string | null
        }
        Insert: {
          capacity: number
          createdAt?: string | null
          defaultPrice?: number | null
          id?: string
          name: string
          photos?: string[] | null
          propertyId: string
          updatedAt?: string | null
        }
        Update: {
          capacity?: number
          createdAt?: string | null
          defaultPrice?: number | null
          id?: string
          name?: string
          photos?: string[] | null
          propertyId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "RoomType_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
        ]
      }
      Service: {
        Row: {
          createdAt: string | null
          description: string | null
          id: string
          name: string
          price: number
          propertyId: string
          tenantId: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          description?: string | null
          id?: string
          name: string
          price: number
          propertyId: string
          tenantId: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          description?: string | null
          id?: string
          name?: string
          price?: number
          propertyId?: string
          tenantId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Service_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Service_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      StockItem: {
        Row: {
          category: string
          createdAt: string | null
          id: string
          name: string
          quantity: number | null
          tenantId: string
          unit: string
          updatedAt: string | null
        }
        Insert: {
          category: string
          createdAt?: string | null
          id?: string
          name: string
          quantity?: number | null
          tenantId: string
          unit: string
          updatedAt?: string | null
        }
        Update: {
          category?: string
          createdAt?: string | null
          id?: string
          name?: string
          quantity?: number | null
          tenantId?: string
          unit?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "StockItem_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Supplier: {
        Row: {
          contact: string | null
          createdAt: string | null
          email: string | null
          id: string
          name: string
          tenantId: string
        }
        Insert: {
          contact?: string | null
          createdAt?: string | null
          email?: string | null
          id?: string
          name: string
          tenantId: string
        }
        Update: {
          contact?: string | null
          createdAt?: string | null
          email?: string | null
          id?: string
          name?: string
          tenantId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Supplier_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      Tenant: {
        Row: {
          createdAt: string | null
          email: string | null
          featureFlags: Json | null
          id: string
          name: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          email?: string | null
          featureFlags?: Json | null
          id?: string
          name: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          email?: string | null
          featureFlags?: Json | null
          id?: string
          name?: string
          updatedAt?: string | null
        }
        Relationships: []
      }
      User: {
        Row: {
          createdAt: string | null
          email: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["UserRole"] | null
          tenantId: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          email: string
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["UserRole"] | null
          tenantId: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          email?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["UserRole"] | null
          tenantId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "User_tenantId_fkey"
            columns: ["tenantId"]
            isOneToOne: false
            referencedRelation: "Tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      UserProperty: {
        Row: {
          id: string
          propertyId: string
          userId: string
        }
        Insert: {
          id?: string
          propertyId: string
          userId: string
        }
        Update: {
          id?: string
          propertyId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserProperty_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "Property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "UserProperty_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_tenant: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      BookingSource: "DIRECT" | "OTA" | "BOOKING_ENGINE"
      BookingStatus:
        | "CONFIRMED"
        | "CHECKED_IN"
        | "CHECKED_OUT"
        | "CANCELLED"
        | "NO_SHOW"
      LeaveStatus: "PENDING" | "APPROVED" | "REJECTED"
      OrderStatus: "PENDING" | "COMPLETED" | "CANCELLED"
      PaymentStatus: "PENDING" | "PAID" | "PARTIAL" | "REFUNDED"
      RoomStatus: "AVAILABLE" | "MAINTENANCE" | "OCCUPIED" | "DIRTY"
      UserRole: "SUPER_ADMIN" | "TENANT_ADMIN" | "PROPERTY_MANAGER" | "STAFF"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      BookingSource: ["DIRECT", "OTA", "BOOKING_ENGINE"],
      BookingStatus: [
        "CONFIRMED",
        "CHECKED_IN",
        "CHECKED_OUT",
        "CANCELLED",
        "NO_SHOW",
      ],
      LeaveStatus: ["PENDING", "APPROVED", "REJECTED"],
      OrderStatus: ["PENDING", "COMPLETED", "CANCELLED"],
      PaymentStatus: ["PENDING", "PAID", "PARTIAL", "REFUNDED"],
      RoomStatus: ["AVAILABLE", "MAINTENANCE", "OCCUPIED", "DIRTY"],
      UserRole: ["SUPER_ADMIN", "TENANT_ADMIN", "PROPERTY_MANAGER", "STAFF"],
    },
  },
} as const
