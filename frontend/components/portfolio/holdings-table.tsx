/**
 * File Purpose: Holdings table component for portfolio display
 * Last Updated: 28 July 2026
 * Dependencies: types/index.ts, lucide-react
 * Related Files: app/(portfolio)/page.tsx
 */

'use client';

import { Holding } from '@/types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface HoldingsTableProps {
  holdings: Holding[];
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Safety check for undefined holdings
  if (!holdings || holdings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">No holdings yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Symbol</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">Quantity</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">Avg Price</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">Current Price</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">Total Cost</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">Current Value</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">P&L</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">P&L %</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => {
            const isPositive = holding.pnL >= 0;
            return (
              <tr key={holding.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">{holding.symbol}</td>
                <td className="px-4 py-3 text-right text-slate-700">{holding.quantity}</td>
                <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(holding.averagePrice)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(holding.currentPrice)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(holding.totalCost)}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatCurrency(holding.currentValue)}
                </td>
                <td className={`px-4 py-3 text-right font-medium flex items-center justify-end gap-2 ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {formatCurrency(holding.pnL)}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {holding.pnlPercentage.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
