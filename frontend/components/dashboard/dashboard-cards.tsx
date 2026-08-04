/**
 * File Purpose: Dashboard summary cards showing key portfolio metrics
 * Last Updated: 28 July 2026
 * Dependencies: lucide-react, types/index.ts
 * Related Files: app/(dashboard)/page.tsx
 */

'use client';

import { TrendingUp, TrendingDown, Wallet, DollarSign } from 'lucide-react';
import { Portfolio } from '@/types';

interface DashboardCardsProps {
  portfolio: Portfolio;
}

export function DashboardCards({ portfolio }: DashboardCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const isPositive = portfolio.totalPnL >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Total Value */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Portfolio Value</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatCurrency(portfolio.totalValue)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Invested Capital */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Invested Capital</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatCurrency(portfolio.investedCapital)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Available Cash */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Available Cash</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatCurrency(portfolio.availableCash)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* P&L */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total P&L</p>
              <p className={`mt-2 text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(portfolio.totalPnL)}
              </p>
              <p className={`mt-1 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {(portfolio.pnlPercentage ?? 0).toFixed(2)}%
              </p>
            </div>
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
              isPositive ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <TrendIcon className={`h-6 w-6 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
