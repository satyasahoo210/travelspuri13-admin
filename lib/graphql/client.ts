import { STORAGE_KEYS } from '@/lib/constants';
import { ApolloClient, InMemoryCache, Observable } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
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

function handleLogout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TENANT_ID);
    localStorage.removeItem(STORAGE_KEYS.PROPERTY_ID);
    window.location.href = '/login';
  }
}

const errorLink = new ErrorLink(({ error, result, operation, forward }) => {
  const graphQLErrors = result?.errors;

  if (graphQLErrors) {
    const hasAuthError = graphQLErrors.some(
      (err: any) =>
        err.extensions?.code === 'UNAUTHENTICATED' ||
        err.message === 'Unauthorized' ||
        err.extensions?.response?.statusCode === 401
    );

    if (hasAuthError) {
      const rememberMe = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true' : false;
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) : null;

      if (rememberMe && refreshToken) {
        return new Observable((observer) => {
          fetch(`/api/v1/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          })
            .then((res) => {
              if (!res.ok) throw new Error('Refresh failed');
              return res.json();
            })
            .then((data) => {
              localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token);
              if (data.refresh_token) {
                localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
              }
              localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
              localStorage.setItem(STORAGE_KEYS.TENANT_ID, data.user.tenantId);

              operation.setContext(({ headers = {} }) => ({
                headers: {
                  ...headers,
                  authorization: `Bearer ${data.access_token}`,
                },
              }));

              const subscriber = forward(operation).subscribe({
                next: (val) => observer.next(val),
                error: (err) => observer.error(err),
                complete: () => observer.complete(),
              });

              return () => {
                if (subscriber) subscriber.unsubscribe();
              };
            })
            .catch((err) => {
              console.error('Token refresh failed during GraphQL request:', err);
              handleLogout();
              observer.error(err);
            });
        });
      } else {
        handleLogout();
      }
    }
  }

  const networkError = error as any;
  if (networkError && (networkError.statusCode === 401 || networkError.response?.status === 401)) {
    handleLogout();
  }
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(errorLink).concat(httpLink),
  cache: new InMemoryCache(),
});


