/**
 * File Purpose: Market statistics card component
 * Last Updated: 29 July 2026
 * Dependencies: None
 * Related Files: app/market/page.tsx
 */

'use client';

interface MarketStatsProps {
  status: 'finnhub' | 'mock' | 'mixed' | 'unavailable';
  dataFreshness: string;
  stocksTracked: number;
}

export function MarketStats({ status, dataFreshness, stocksTracked }: MarketStatsProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'finnhub':
        return { bg: 'bg-green-100', text: 'text-green-800', badge: 'bg-green-600' };
      case 'mock':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: 'bg-yellow-600' };
      case 'mixed':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: 'bg-yellow-600' };
      case 'unavailable':
        return { bg: 'bg-gray-100', text: 'text-gray-800', badge: 'bg-gray-600' };
    }
  };

  const colors = getStatusColor();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-slate-600">Market Data Feed</p>
            <p className="text-lg font-bold text-slate-900">
              {status === 'finnhub' ? 'Finnhub' : status === 'mock' ? 'Mock data' : status === 'mixed' ? 'Mixed sources' : 'Unavailable'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors.bg}`}>
            <span className={`w-3 h-3 rounded-full ${colors.badge} ${
              status === 'finnhub' ? 'animate-pulse' : ''
            }`}></span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-slate-600">Refresh Cadence</p>
            <p className="text-lg font-bold text-slate-900">{dataFreshness}</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <span className="text-lg">🔄</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-slate-600">Stocks Tracked</p>
            <p className="text-lg font-bold text-slate-900">{stocksTracked}/10</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
        </div>
      </div>
    </div>
  );
}
