/**
 * File Purpose: Custom React hooks for API data fetching
 * Last Updated: 28 July 2026
 * Dependencies: @tanstack/react-query, axios
 * Related Files: lib/api-client.ts, types/api.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './api-client';

// Portfolio Hooks
export function usePortfolioSummary() {
  return useQuery({
    queryKey: ['portfolio', 'summary'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/portfolio/summary');
      return data;
    },
  });
}

export function usePortfolioHoldings() {
  return useQuery({
    queryKey: ['portfolio', 'holdings'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/portfolio/holdings');
      return data;
    },
  });
}

// Market Data Hooks
export function useMarketPrice(symbol: string) {
  return useQuery({
    queryKey: ['market', 'price', symbol],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/market/price?symbol=${symbol}`);
      return data;
    },
    enabled: !!symbol,
  });
}

export function useMarketHistory(symbol: string, days: number = 30) {
  return useQuery({
    queryKey: ['market', 'history', symbol, days],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/market/history?symbol=${symbol}&days=${days}`);
      return data;
    },
    enabled: !!symbol,
  });
}

// Trade Hooks
export function useTradeHistory() {
  return useQuery({
    queryKey: ['trades', 'history'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/trades/history');
      return data;
    },
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (order: any) => {
      const { data } = await apiClient.post('/api/trades/place-order', order);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio', 'summary'] });
    },
  });
}

// Analysis Hooks
export function useAnalysisSuggestions() {
  return useQuery({
    queryKey: ['analysis', 'suggestions'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/analysis/suggestions');
      return data;
    },
  });
}

export function useRebalanceAnalysis() {
  return useQuery({
    queryKey: ['analysis', 'rebalance'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/analysis/rebalance');
      return data;
    },
  });
}
