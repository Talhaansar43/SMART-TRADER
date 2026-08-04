/**
 * Skeleton Loader Component - Shows placeholder content while loading
 * Prevents "flash of blank screen" and improves perceived performance
 */

import React from 'react';

type SkeletonVariant = 'card' | 'table-row' | 'text' | 'circle' | 'button' | 'list-item';

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  count?: number;
  width?: string;
  height?: string;
  className?: string;
}

export function SkeletonLoader({
  variant = 'card',
  count = 1,
  width = 'w-full',
  height = 'h-12',
  className = '',
}: SkeletonLoaderProps) {
  const baseClass = 'animate-pulse bg-gray-200 rounded';

  const variantClass = {
    card: 'h-48 w-full rounded-lg mb-4',
    'table-row': 'h-10 w-full mb-2',
    text: 'h-4 w-3/4 mb-2',
    circle: 'h-12 w-12 rounded-full',
    button: 'h-10 w-20',
    'list-item': 'flex items-center space-x-4 mb-4',
  };

  const selectedClass = variantClass[variant] || variantClass.card;

  // Render multiple skeletons
  if (count > 1) {
    return (
      <div className={className}>
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className={`${baseClass} ${selectedClass}`} />
        ))}
      </div>
    );
  }

  // Render single skeleton
  if (variant === 'list-item') {
    return (
      <div className={`${className} flex items-center space-x-4`}>
        <div className={`${baseClass} h-12 w-12 rounded-full`} />
        <div className="flex-1 space-y-2">
          <div className={`${baseClass} h-4 w-3/4`} />
          <div className={`${baseClass} h-4 w-1/2`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${baseClass} ${selectedClass} ${className}`} />
  );
}

// Specialized skeleton for market table
export function MarketTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="flex items-center space-x-4 p-4 bg-white rounded">
          <SkeletonLoader variant="text" width="w-16" />
          <SkeletonLoader variant="text" width="w-20" />
          <SkeletonLoader variant="text" width="w-16" />
          <SkeletonLoader variant="text" width="w-16" />
          <SkeletonLoader variant="text" width="w-20" />
        </div>
      ))}
    </div>
  );
}

// Specialized skeleton for dashboard
export function DashboardCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="bg-white rounded-lg p-4">
          <SkeletonLoader variant="text" width="w-1/2" />
          <SkeletonLoader variant="text" width="w-3/4" height="h-8" className="mt-2" />
        </div>
      ))}
    </div>
  );
}
