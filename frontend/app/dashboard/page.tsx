/**
 * File Purpose: Dashboard page - overview of portfolio metrics and performance
 * Last Updated: 28 July 2026
 * Dependencies: lib/hooks.ts, components/dashboard/*, components/charts/*
 * Related Files: app/layout.tsx, components/common/loading.tsx
 */

'use client';

import { MarketOverview } from '@/components/dashboard/market-overview';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Market dashboard</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Market overview</h1>
        <p className="mt-2 text-slate-600">Benchmark performance, trend breadth, momentum, and volatility from verified daily data.</p>
      </header>

      <div className="mx-auto w-full max-w-7xl">
        <MarketOverview />
      </div>
    </div>
  );
}
