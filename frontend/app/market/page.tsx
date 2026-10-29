/**
 * File Purpose: Market overview page - display top 10 stocks with live data
 * Last Updated: 29 July 2026
 * Dependencies: lib/hooks.ts, components/market/*
 * Related Files: app/layout.tsx, components/market/*
 */

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loading } from '@/components/common/loading';
import { Error as ErrorComponent } from '@/components/common/error';
import { MarketTableSkeleton } from '@/components/common/skeleton-loader';
import { MarketStats } from '@/components/market/market-stats';
import { PriceChangeIndicator } from '@/components/market/price-change-indicator';

interface StockData {
  symbol: string;
  currentPrice: number;
  open: number;
  high: number;
  low: number;
  volume: number | null;
  previousClose: number;
  change: number;
  changePercent: number;
  cached: boolean;
  mock: boolean;
  source: string;
  lastUpdated: string;
  dataTimestamp?: string | null;
  retrievedAt?: string;
}

// Top 10 popular stocks
const TOP_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'ADBE', 'CRM'];

type FeedStatus = 'finnhub' | 'mock' | 'mixed' | 'unavailable';

const getFeedStatus = (stocks: StockData[]): FeedStatus => {
  if (stocks.length === 0) return 'unavailable';

  const sources = new Set(stocks.map((stock) => stock.source));
  if (sources.size === 1 && sources.has('finnhub')) return 'finnhub';
  if (sources.size === 1 && sources.has('mock')) return 'mock';
  if (sources.size === 1 && sources.has('error')) return 'unavailable';
  return 'mixed';
};

const fetchStockPrice = async (symbol: string) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/market/price?symbol=${symbol}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch ${symbol}`);
  }
  return response.json();
};

export default function MarketPage() {
  const [stocksData, setStocksData] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all stocks with progressive loading
  const { data: stocks, isLoading: isFetching, error } = useQuery({
    queryKey: ['topStocks'],
    queryFn: async () => {
      const results: StockData[] = [];
      
      // Fetch stocks one by one and update state progressively
      for (const symbol of TOP_SYMBOLS) {
        try {
          const data = await fetchStockPrice(symbol);
          const change = data.currentPrice - data.previousClose;
          const changePercent = (change / data.previousClose) * 100;
          const stockData = {
            ...data,
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
          };
          results.push(stockData);
          // Update state as each stock loads for progressive rendering
          setStocksData([...results]);
        } catch (err) {
          console.error(`Failed to fetch ${symbol}:`, err);
        }
      }
      
      return results;
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 4 * 60 * 1000, // Data is fresh for 4 minutes
  });

  // Set loading to false once we have at least some data
  useEffect(() => {
    if (stocksData.length > 0) {
      setIsLoading(false);
    }
  }, [stocksData]);

  const feedStatus = getFeedStatus(stocksData);

  const getStatusBadge = (status: FeedStatus) => {
    switch (status) {
      case 'finnhub':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <span className="w-2 h-2 bg-green-600 rounded-full"></span>
            Finnhub feed
          </span>
        );
      case 'mock':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
            Mock data
          </span>
        );
      case 'mixed':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
            Mixed sources
          </span>
        );
      case 'unavailable':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
            No quote data
          </span>
        );
    }
  };

  const getDataSourceBadge = (stock: StockData) => {
    if (stock.mock) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
          Mock Data
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
        {stock.source.toUpperCase()}
      </span>
    );
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if ((isLoading || isFetching) && stocksData.length === 0) {
    return (
      <div className="space-y-6 mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Market Overview</h1>
            <p className="mt-2 text-slate-600">Track quotes with their source and cache status</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold">Top 10 Stocks</h2>
          </div>
          <div className="card-body">
            <MarketTableSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error) return <ErrorComponent message="Failed to load market data" />;

  return (
    <div className="space-y-6 mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Market Overview</h1>
            <p className="mt-2 text-slate-600">Track quotes with their source and cache status</p>
        </div>
        <div>{getStatusBadge(feedStatus)}</div>
      </div>

      {/* Market Info Card */}
      <MarketStats 
        status={feedStatus}
        dataFreshness="5 minutes"
        stocksTracked={stocksData.length}
      />

      {/* Stocks Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-bold">Top 10 Stocks</h2>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Symbol</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Price</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Change</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Change %</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Open</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">High</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Low</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Volume</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Data Source</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Cached</th>
                </tr>
              </thead>
              <tbody>
                {stocksData.map((stock, idx) => (
                  <tr key={stock.symbol} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{stock.symbol}</td>
                    <td className="px-6 py-4">
                      <PriceChangeIndicator 
                        currentPrice={stock.currentPrice}
                        changePercent={stock.changePercent}
                        changeAmount={stock.change}
                      />
                    </td>
                    <td className={`px-6 py-4 text-sm font-semibold ${getChangeColor(stock.change)}`}>
                      {stock.change > 0 ? '+' : ''}{(stock.change ?? 0).toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 text-sm font-semibold ${getChangeColor(stock.changePercent)}`}>
                      {stock.changePercent > 0 ? '+' : ''}{(stock.changePercent ?? 0).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">${(stock.open ?? 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">${(stock.high ?? 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">${(stock.low ?? 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {stock.volume ? (stock.volume / 1000000).toFixed(1) + 'M' : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">{getDataSourceBadge(stock)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        stock.cached 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {stock.cached ? 'Cached' : 'Fresh'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-sm text-slate-600">
        <p>Latest provider timestamp: {stocksData[0]?.dataTimestamp ? new Date(stocksData[0].dataTimestamp).toLocaleString() : 'Unavailable'}</p>
        <p>Last checked: {stocksData[0]?.retrievedAt ? new Date(stocksData[0].retrievedAt).toLocaleString() : 'Unavailable'}</p>
      </div>
    </div>
  );
}
