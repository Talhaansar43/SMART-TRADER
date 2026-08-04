/**
 * File Purpose: Dashboard page - overview of portfolio metrics and performance
 * Last Updated: 28 July 2026
 * Dependencies: lib/hooks.ts, components/dashboard/*, components/charts/*
 * Related Files: app/layout.tsx, components/common/loading.tsx
 */

'use client';

import { usePortfolioSummary } from '@/lib/hooks';
import { DashboardCards } from '@/components/dashboard/dashboard-cards';
import { PnLChart } from '@/components/charts/pnl-chart';
import { HoldingsDistribution } from '@/components/charts/holdings-distribution';
import { Loading } from '@/components/common/loading';
import { Error } from '@/components/common/error';
import { DashboardCardSkeleton } from '@/components/common/skeleton-loader';

export default function DashboardPage() {
  const { data: portfolio, isLoading, error } = usePortfolioSummary();

  // Show skeleton loaders while loading
  if (isLoading && !portfolio) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-slate-600">Track your portfolio performance at a glance</p>
        </div>
        <DashboardCardSkeleton />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 bg-white rounded-lg animate-pulse" />
          <div className="h-64 bg-white rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) return <Error message="Failed to load portfolio data" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-600">Track your portfolio performance at a glance</p>
      </div>

      {/* Key Metrics */}
      <DashboardCards portfolio={portfolio} />

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* P&L Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold">P&L Performance</h2>
            <span className="text-sm text-slate-500">Last 7 days</span>
          </div>
          <div className="card-body">
            <PnLChart />
          </div>
        </div>

        {/* Holdings Distribution */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold">Portfolio Distribution</h2>
          </div>
          <div className="card-body">
            <HoldingsDistribution />
          </div>
        </div>
      </div>
    </div>
  );
}
