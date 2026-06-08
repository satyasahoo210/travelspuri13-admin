import { apolloClient } from '../graphql/client';
import { gql, TypedDocumentNode } from '@apollo/client';
import { Room } from '../db/dexie';

interface SyncRoomsResponse {
  syncRooms: {
    data: Room[];
    timestamp: number;
  };
}

interface SyncRoomsVariables {
  propertyId: string;
  since: string;
}

interface CreateRoomResponse {
  createRoom: Room;
}

interface CreateRoomVariables {
  input: any;
}

interface UpdateRoomResponse {
  updateRoom: Room;
}

interface UpdateRoomVariables {
  id: string;
  input: any;
}

interface UpdateRoomStatusResponse {
  updateRoomStatus: Room;
}

interface UpdateRoomStatusVariables {
  id: string;
  status: any;
}

const SYNC_ROOMS: TypedDocumentNode<SyncRoomsResponse, SyncRoomsVariables> = gql`
  query SyncRooms($propertyId: String!, $since: String) {
    syncRooms(propertyId: $propertyId, since: $since) {
      data {
        id
        roomNumber
        roomTypeId
        status
        housekeepingStatus
        priorityCleaning
        updatedAt
      }
      timestamp
    }
  }
`;

const CREATE_ROOM: TypedDocumentNode<CreateRoomResponse, CreateRoomVariables> = gql`
  mutation CreateRoom($input: CreateRoomInput!) {
    createRoom(input: $input) {
      id
      roomNumber
      roomTypeId
      status
      housekeepingStatus
      priorityCleaning
      updatedAt
    }
  }
`;

const UPDATE_ROOM: TypedDocumentNode<UpdateRoomResponse, UpdateRoomVariables> = gql`
  mutation UpdateRoom($id: ID!, $input: UpdateRoomInput!) {
    updateRoom(id: $id, input: $input) {
      id
      roomNumber
      roomTypeId
      status
      housekeepingStatus
      priorityCleaning
      updatedAt
    }
  }
`;

const UPDATE_ROOM_STATUS: TypedDocumentNode<UpdateRoomStatusResponse, UpdateRoomStatusVariables> = gql`
  mutation UpdateRoomStatus($id: ID!, $status: HousekeepingStatus!) {
    updateRoomStatus(id: $id, status: $status) {
      id
      roomNumber
      roomTypeId
      status
      housekeepingStatus
      priorityCleaning
      updatedAt
    }
  }
`;

export const roomApi = {
  sync: async (lastSyncedAt: number, propertyId: string) => {
    const { data } = await apolloClient.query({
      query: SYNC_ROOMS,
      variables: { propertyId, since: lastSyncedAt.toString() },
      fetchPolicy: 'network-only'
    });
    return {
      data: data?.syncRooms.data,
      timestamp: data?.syncRooms.timestamp
    };
  },
  
  create: async (roomData: any) => {
    const { data } = await apolloClient.mutate({
      mutation: CREATE_ROOM,
      variables: { input: roomData }
    });
    return data?.createRoom;
  },

  update: async (id: string, roomData: any) => {
    const { id: _, updatedAt: __, createdAt: ___, ...input } = roomData;
    const { data } = await apolloClient.mutate({
      mutation: UPDATE_ROOM,
      variables: { id, input }
    });
    return data?.updateRoom;
  },

  updateStatus: async (id: string, status: any) => {
    const { data } = await apolloClient.mutate({
      mutation: UPDATE_ROOM_STATUS,
      variables: { id, status }
    });
    return data?.updateRoomStatus;
  }
};
