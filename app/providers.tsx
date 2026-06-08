'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from '@/lib/graphql/client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ApolloProvider client={apolloClient}>
        {children}
      </ApolloProvider>
    </QueryClientProvider>
  );
}
