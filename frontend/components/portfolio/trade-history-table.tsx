/**
 * File Purpose: Trade history table component
 * Last Updated: 28 July 2026
 * Dependencies: types/index.ts
 * Related Files: app/(portfolio)/page.tsx
 */

'use client';

import { Trade } from '@/types';

interface TradeHistoryTableProps {
  trades: Trade[];
}

export function TradeHistoryTable({ trades }: TradeHistoryTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      PENDING: 'badge-warning',
      EXECUTED: 'badge-success',
      FAILED: 'badge-danger',
      CANCELLED: 'badge',
    };
    return statusClasses[status as keyof typeof statusClasses] || 'badge';
  };

  const getTypeBadge = (type: string) => {
    return type === 'BUY' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700';
  };

  // Safety check for undefined trades
  if (!trades || trades.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">No trades yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Symbol</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700">Type</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">Quantity</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">Price</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700">Total Amount</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 text-slate-700">{formatDate(trade.executedAt)}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{trade.symbol}</td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${getTypeBadge(trade.type)}`}>
                  {trade.type}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-slate-700">{trade.quantity}</td>
              <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(trade.price)}</td>
              <td className="px-4 py-3 text-right font-medium text-slate-900">
                {formatCurrency(trade.totalAmount)}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(trade.status)}`}>
                  {trade.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {trades.length === 0 && (
        <div className="py-8 text-center text-slate-500">
          No trades found. Start trading to see history here.
        </div>
      )}
    </div>
  );
}
