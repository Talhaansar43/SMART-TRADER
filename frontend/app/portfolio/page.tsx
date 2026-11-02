/**
 * File Purpose: Portfolio main page - track holdings and transaction history
 * Last Updated: 28 July 2026
 * Dependencies: lib/hooks.ts, components/portfolio/*
 * Related Files: app/layout.tsx
 */

'use client';

import { usePortfolioHoldings, usePortfolioSummary, useTradeHistory } from '@/lib/hooks';
import { HoldingsTable } from '@/components/portfolio/holdings-table';
import { TradeHistoryTable } from '@/components/portfolio/trade-history-table';
import { DashboardCards } from '@/components/dashboard/dashboard-cards';
import { HoldingsDistribution } from '@/components/charts/holdings-distribution';
import { Loading } from '@/components/common/loading';
import { Error } from '@/components/common/error';
import { DashboardCardSkeleton, SkeletonLoader } from '@/components/common/skeleton-loader';

export default function PortfolioPage() {
  const { data: portfolio, isLoading: portfolioLoading, error: portfolioError } = usePortfolioSummary();
  const { data: holdings, isLoading: holdingsLoading, error: holdingsError } = usePortfolioHoldings();
  const { data: trades, isLoading: tradesLoading, error: tradesError } = useTradeHistory();

  // Show skeletons while loading
  if ((portfolioLoading || holdingsLoading || tradesLoading) && !portfolio && !holdings && !trades) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Portfolio</h1>
          <p className="mt-2 text-slate-600">Account value, holdings, allocation, and trade history</p>
        </div>
        <DashboardCardSkeleton />

        {/* Skeleton for Holdings */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-bold">Current Holdings</h2>
            <button className="btn-primary" disabled>+ Add Position</button>
          </div>
          <div className="card-body">
            <SkeletonLoader variant="table-row" count={3} />
          </div>
        </div>

        {/* Skeleton for Trade History */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold">Trade History</h2>
          </div>
          <div className="card-body">
            <SkeletonLoader variant="table-row" count={5} />
          </div>
        </div>
      </div>
    );
  }

  if (portfolioError || holdingsError || tradesError) return <Error message="Failed to load portfolio data" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Portfolio</h1>
        <p className="mt-2 text-slate-600">Account value, holdings, allocation, and trade history</p>
      </div>

      <DashboardCards portfolio={portfolio} />

      <div className="card max-w-3xl">
        <div className="card-header">
          <h2 className="text-lg font-bold">Portfolio Distribution</h2>
        </div>
        <div className="card-body">
          <HoldingsDistribution />
        </div>
      </div>

      {/* Current Holdings */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-bold">Current Holdings</h2>
          <button className="btn-primary">+ Add Position</button>
        </div>
        <div className="card-body">
          <HoldingsTable holdings={holdings} />
        </div>
      </div>

      {/* Trade History */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-bold">Trade History</h2>
        </div>
        <div className="card-body">
          <TradeHistoryTable trades={trades} />
        </div>
      </div>
    </div>
  );
}
