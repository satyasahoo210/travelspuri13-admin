import { gql, TypedDocumentNode } from '@apollo/client';
import { Booking } from '../db/dexie';
import { apolloClient } from '../graphql/client';

interface SyncBookingsResponse {
  syncBookings: {
    data: Booking[];
    timestamp: number;
  };
}

interface SyncBookingsVariables {
  propertyId: string;
  since: string;
}

interface CreateBookingResponse {
  createBooking: Booking;
}

interface CreateBookingVariables {
  input: any;
}

interface UpdateBookingResponse {
  updateBooking: Booking;
}

interface UpdateBookingVariables {
  id: string;
  input: any;
}

const SYNC_BOOKINGS: TypedDocumentNode<SyncBookingsResponse, SyncBookingsVariables> = gql`
  query SyncBookings($propertyId: String!, $since: String) {
    syncBookings(propertyId: $propertyId, since: $since) {
      data {
        id
        guestId
        propertyId
        tenantId
        checkInDate
        checkOutDate
        status
        source
        totalAmount
        updatedAt
      }
      timestamp
    }
  }
`;

const CREATE_BOOKING: TypedDocumentNode<CreateBookingResponse, CreateBookingVariables> = gql`
  mutation CreateBooking($input: CreateBookingInput!) {
    createBooking(input: $input) {
      id
      guestId
      propertyId
      tenantId
      checkInDate
      checkOutDate
      status
      source
      totalAmount
      updatedAt
    }
  }
`;

const UPDATE_BOOKING: TypedDocumentNode<UpdateBookingResponse, UpdateBookingVariables> = gql`
  mutation UpdateBooking($id: ID!, $input: UpdateBookingInput!) {
    updateBooking(id: $id, input: $input) {
      id
      guestId
      propertyId
      tenantId
      checkInDate
      checkOutDate
      status
      source
      totalAmount
      updatedAt
    }
  }
`;

export const bookingApi = {
  // Pull sync bookings
  sync: async (lastSyncedAt: number, propertyId: string) => {
    const { data } = await apolloClient.query({
      query: SYNC_BOOKINGS,
      variables: { propertyId, since: lastSyncedAt.toString() },
      fetchPolicy: 'network-only'
    });
    return {
      data: data?.syncBookings.data,
      timestamp: data?.syncBookings.timestamp
    };
  },

  // Create booking (Backend)
  create: async (bookingData: any) => {
    const { data } = await apolloClient.mutate({
      mutation: CREATE_BOOKING,
      variables: { input: bookingData }
    });
    return data?.createBooking;
  },

  // Update booking (Backend)
  update: async (id: string, bookingData: any) => {
    const { id: _, updatedAt: __, createdAt: ___, guestId: ____, propertyId: _____, tenantId: ______, ...input } = bookingData;
    const { data } = await apolloClient.mutate({
      mutation: UPDATE_BOOKING,
      variables: { id, input }
    });
    return data?.updateBooking;
  },
};
