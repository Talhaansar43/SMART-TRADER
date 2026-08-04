/**
 * File Purpose: TypeScript interfaces and types for frontend
 * Last Updated: 28 July 2026
 * Dependencies: None
 * Related Files: lib/hooks.ts, components/*
 */

// Portfolio Types
export interface Portfolio {
  id: string;
  userId: string;
  totalValue: number;
  availableCash: number;
  investedCapital: number;
  seedCapital: number;
  dailyPnL: number;
  weeklyPnL: number;
  totalPnL: number;
  pnlPercentage: number;
  lastUpdated: string;
}

export interface Holding {
  id: string;
  portfolioId: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  pnL: number;
  pnlPercentage: number;
  lastUpdated: string;
}

// Trade Types
export interface Trade {
  id: string;
  portfolioId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  totalAmount: number;
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
  executedAt: string;
  createdAt: string;
}

export interface Order {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  orderType: 'MARKET' | 'LIMIT';
  status: 'PENDING' | 'PLACED' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
}

// Market Data Types
export interface MarketPrice {
  symbol: string;
  currentPrice: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketCap: string;
  pe: number | null;
  eps: number | null;
  lastUpdated: string;
}

export interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Analysis Types
export interface Suggestion {
  id: string;
  portfolioId: string;
  type: 'BUY' | 'SELL' | 'REBALANCE' | 'HOLD';
  symbol: string;
  reason: string;
  targetPrice?: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  potentialReturn: number;
  confidence: number;
  createdAt: string;
}

export interface RebalanceAnalysis {
  portfolioId: string;
  recommendation: string;
  targetAllocation: Record<string, number>;
  currentAllocation: Record<string, number>;
  expectedReturn: number;
  risk: number;
  sharpeRatio: number;
}

// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
