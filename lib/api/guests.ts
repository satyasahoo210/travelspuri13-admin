import { apolloClient } from '../graphql/client';
import { gql, TypedDocumentNode } from '@apollo/client';
import { Guest } from '../db/dexie';

interface SyncGuestsResponse {
  syncGuests: {
    data: Guest[];
    timestamp: number;
  };
}

interface SyncGuestsVariables {
  since: string;
}

interface CreateGuestResponse {
  createGuest: Guest;
}

interface CreateGuestVariables {
  input: any;
}

interface UpdateGuestResponse {
  updateGuest: Guest;
}

interface UpdateGuestVariables {
  id: string;
  input: any;
}

const SYNC_GUESTS: TypedDocumentNode<SyncGuestsResponse, SyncGuestsVariables> = gql`
  query SyncGuests($since: String) {
    syncGuests(since: $since) {
      data {
        id
        name
        phone
        email
        address
        idProofType
        idProofNumber
        idProofUrl
        gstin
        grNumber
        preferences
        notes
        updatedAt
      }
      timestamp
    }
  }
`;

const CREATE_GUEST: TypedDocumentNode<CreateGuestResponse, CreateGuestVariables> = gql`
  mutation CreateGuest($input: CreateGuestInput!) {
    createGuest(input: $input) {
      id
      name
      phone
      email
      address
      idProofType
      idProofNumber
      idProofUrl
      gstin
      grNumber
      preferences
      notes
      updatedAt
    }
  }
`;

const UPDATE_GUEST: TypedDocumentNode<UpdateGuestResponse, UpdateGuestVariables> = gql`
  mutation UpdateGuest($id: ID!, $input: UpdateGuestInput!) {
    updateGuest(id: $id, input: $input) {
      id
      name
      phone
      email
      address
      idProofType
      idProofNumber
      idProofUrl
      gstin
      grNumber
      preferences
      notes
      updatedAt
    }
  }
`;

export const guestApi = {
  sync: async (lastSyncedAt: number) => {
    const { data } = await apolloClient.query({
      query: SYNC_GUESTS,
      variables: { since: lastSyncedAt.toString() },
      fetchPolicy: 'network-only'
    });
    return {
      data: data?.syncGuests.data,
      timestamp: data?.syncGuests.timestamp
    };
  },
  
  create: async (guestData: any) => {
    const { data } = await apolloClient.mutate({
      mutation: CREATE_GUEST,
      variables: { input: guestData }
    });
    return data?.createGuest;
  },

  update: async (id: string, guestData: any) => {
    const { id: _, updatedAt: __, createdAt: ___, tenantId: ____, ...input } = guestData;
    const { data } = await apolloClient.mutate({
      mutation: UPDATE_GUEST,
      variables: { id, input }
    });
    return data?.updateGuest;
  }
};
