/**
 * File Purpose: TanStack Query client configuration for data fetching and caching
 * Last Updated: 28 July 2026
 * Dependencies: @tanstack/react-query
 * Related Files: lib/api-client.ts
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
