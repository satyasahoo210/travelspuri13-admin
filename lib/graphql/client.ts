import { STORAGE_KEYS } from '@/lib/constants';
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { HttpLink } from '@apollo/client/link/http';


const httpLink = new HttpLink({
  uri: `/api/v1/graphql`
});

const authLink = new SetContextLink(({ headers }) => {
  // Safe check for browser context to read localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
