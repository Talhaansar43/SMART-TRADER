/**
 * File Purpose: Stock price change indicator component with trending visuals
 * Last Updated: 29 July 2026
 * Dependencies: None
 * Related Files: app/market/page.tsx
 */

'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface PriceChangeIndicatorProps {
  changePercent: number;
  changeAmount: number;
  currentPrice: number;
  className?: string;
}

export function PriceChangeIndicator({
  changePercent,
  changeAmount,
  currentPrice,
  className = '',
}: PriceChangeIndicatorProps) {
  const safeCurrent = currentPrice ?? 0;
  const safePercent = changePercent ?? 0;
  const safeAmount = changeAmount ?? 0;

  const isPositive = safePercent > 0;
  const isNeutral = safePercent === 0;

  const baseClasses = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium';
  const colorClasses = isNeutral
    ? 'bg-gray-100 text-gray-700'
    : isPositive
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700';

  const IconComponent = isNeutral ? Minus : isPositive ? ArrowUp : ArrowDown;

  return (
    <div className={className}>
      <span className="text-lg font-semibold text-slate-900">${safeCurrent.toFixed(2)}</span>
      <span className={`${baseClasses} ${colorClasses}`}>
        <IconComponent size={16} />
        {isNeutral ? '—' : `${Math.abs(safePercent).toFixed(2)}%`}
      </span>
      <span className={`text-sm ${isPositive ? 'text-green-600' : isNeutral ? 'text-gray-600' : 'text-red-600'}`}>
        {safeAmount > 0 ? '+' : ''} ${Math.abs(safeAmount).toFixed(2)}
      </span>
    </div>
  );
}
