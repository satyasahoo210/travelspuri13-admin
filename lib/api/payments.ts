import { apolloClient } from '../graphql/client';
import { gql, TypedDocumentNode } from '@apollo/client';
import { Payment } from '../db/dexie';

interface SyncBillingsResponse {
  syncBillings: {
    data: Payment[];
    timestamp: number;
  };
}

interface SyncBillingsVariables {
  propertyId: string;
  since: string;
}

interface CreatePaymentResponse {
  createPayment: Payment;
}

interface CreatePaymentVariables {
  input: any;
}

interface UpdatePaymentResponse {
  updatePayment: Payment;
}

interface UpdatePaymentVariables {
  id: string;
  input: any;
}

const SYNC_BILLINGS: TypedDocumentNode<SyncBillingsResponse, SyncBillingsVariables> = gql`
  query SyncBillings($propertyId: String!, $since: String) {
    syncBillings(propertyId: $propertyId, since: $since) {
      data {
        id
        bookingId
        amount
        method
        status
        updatedAt
      }
      timestamp
    }
  }
`;

const CREATE_PAYMENT: TypedDocumentNode<CreatePaymentResponse, CreatePaymentVariables> = gql`
  mutation CreatePayment($input: CreatePaymentInput!) {
    createPayment(input: $input) {
      id
      bookingId
      amount
      method
      status
      updatedAt
    }
  }
`;

const UPDATE_PAYMENT: TypedDocumentNode<UpdatePaymentResponse, UpdatePaymentVariables> = gql`
  mutation UpdatePayment($id: ID!, $input: UpdatePaymentInput!) {
    updatePayment(id: $id, input: $input) {
      id
      bookingId
      amount
      method
      status
      updatedAt
    }
  }
`;

export const paymentApi = {
  sync: async (lastSyncedAt: number, propertyId: string) => {
    const { data } = await apolloClient.query({
      query: SYNC_BILLINGS,
      variables: { propertyId, since: lastSyncedAt.toString() },
      fetchPolicy: 'network-only'
    });
    return {
      data: data?.syncBillings.data,
      timestamp: data?.syncBillings.timestamp
    };
  },
  
  record: async (paymentData: any) => {
    return paymentApi.create(paymentData);
  },

  create: async (paymentData: any) => {
    const { data } = await apolloClient.mutate({
      mutation: CREATE_PAYMENT,
      variables: { input: paymentData }
    });
    return data?.createPayment;
  },

  update: async (id: string, paymentData: any) => {
    const { id: _, updatedAt: __, createdAt: ___, bookingId: ____, tenantId: _____, ...input } = paymentData;
    const { data } = await apolloClient.mutate({
      mutation: UPDATE_PAYMENT,
      variables: { id, input }
    });
    return data?.updatePayment;
  }
};
