import { apolloClient } from '../graphql/client';
import { gql, TypedDocumentNode } from '@apollo/client';

interface BackendRoomType {
  id: string;
  propertyId: string;
  name: string;
  defaultPrice: number;
  capacity: number;
  updatedAt: number;
}

interface SyncRoomTypesResponse {
  syncRoomTypes: {
    data: BackendRoomType[];
    timestamp: number;
  };
}

interface SyncRoomTypesVariables {
  propertyId: string;
  since: string;
}

interface CreateRoomTypeResponse {
  createRoomType: BackendRoomType;
}

interface CreateRoomTypeVariables {
  input: any;
}

interface UpdateRoomTypeResponse {
  updateRoomType: BackendRoomType;
}

interface UpdateRoomTypeVariables {
  id: string;
  input: any;
}

const SYNC_ROOM_TYPES: TypedDocumentNode<SyncRoomTypesResponse, SyncRoomTypesVariables> = gql`
  query SyncRoomTypes($propertyId: String!, $since: String) {
    syncRoomTypes(propertyId: $propertyId, since: $since) {
      data {
        id
        propertyId
        name
        defaultPrice
        capacity
        updatedAt
      }
      timestamp
    }
  }
`;

const CREATE_ROOM_TYPE: TypedDocumentNode<CreateRoomTypeResponse, CreateRoomTypeVariables> = gql`
  mutation CreateRoomType($input: CreateRoomTypeInput!) {
    createRoomType(input: $input) {
      id
      propertyId
      name
      defaultPrice
      capacity
      updatedAt
    }
  }
`;

const UPDATE_ROOM_TYPE: TypedDocumentNode<UpdateRoomTypeResponse, UpdateRoomTypeVariables> = gql`
  mutation UpdateRoomType($id: ID!, $input: UpdateRoomTypeInput!) {
    updateRoomType(id: $id, input: $input) {
      id
      propertyId
      name
      defaultPrice
      capacity
      updatedAt
    }
  }
`;

export const roomTypeApi = {
  sync: async (lastSyncedAt: number, propertyId: string) => {
    const { data } = await apolloClient.query({
      query: SYNC_ROOM_TYPES,
      variables: { propertyId, since: lastSyncedAt.toString() },
      fetchPolicy: 'network-only'
    });
    const mappedData = data?.syncRoomTypes.data.map((item) => ({
      ...item,
      baseRate: item.defaultPrice
    }));
    return {
      data: mappedData,
      timestamp: data?.syncRoomTypes.timestamp
    };
  },
  
  create: async (roomTypeData: any) => {
    const { baseRate, ...rest } = roomTypeData;
    const input = {
      ...rest,
      defaultPrice: baseRate
    };
    const { data } = await apolloClient.mutate({
      mutation: CREATE_ROOM_TYPE,
      variables: { input }
    });
    if (!data) return null;
    return {
      ...data.createRoomType,
      baseRate: data.createRoomType.defaultPrice
    };
  },

  update: async (id: string, roomTypeData: any) => {
    const { baseRate, id: _, updatedAt: __, createdAt: ___, propertyId: ____, ...rest } = roomTypeData;
    const input = {
      ...rest,
      ...(baseRate !== undefined ? { defaultPrice: baseRate } : {})
    };
    const { data } = await apolloClient.mutate({
      mutation: UPDATE_ROOM_TYPE,
      variables: { id, input }
    });
    if (!data) return null;
    return {
      ...data.updateRoomType,
      baseRate: data.updateRoomType.defaultPrice
    };
  }
};
