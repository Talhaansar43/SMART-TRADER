/**
 * File Purpose: Enhanced Loading spinner component with skeletons
 * Last Updated: 30 July 2026
 * Dependencies: SkeletonLoader, EmptyState
 * Related Files: pages using Loading component
 */

'use client';

import { useState, useEffect } from 'react';
import { SkeletonLoader, DashboardCardSkeleton, MarketTableSkeleton } from './skeleton-loader';

interface LoadingProps {
  message?: string;
  variant?: 'default' | 'dashboard' | 'market-table' | 'full-page';
  showProgress?: boolean;
  progressPercent?: number;
}

const loadingMessages = [
  'Loading data...',
  'Fetching latest prices...',
  'Connecting to market...',
  'Almost there...',
  'Just a moment...',
];

export function Loading({
  message,
  variant = 'default',
  showProgress = false,
  progressPercent = 0,
}: LoadingProps) {
  const [displayMessage, setDisplayMessage] = useState(message || loadingMessages[0]);
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotate messages every 2 seconds to show activity
  useEffect(() => {
    if (!message) {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        setDisplayMessage(loadingMessages[(messageIndex + 1) % loadingMessages.length]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [message, messageIndex]);

  // Variant-specific rendering
  const renderContent = () => {
    switch (variant) {
      case 'dashboard':
        return (
          <div className="space-y-4">
            <DashboardCardSkeleton />
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">{displayMessage}</p>
            </div>
          </div>
        );

      case 'market-table':
        return (
          <div className="space-y-4">
            <MarketTableSkeleton />
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">{displayMessage}</p>
            </div>
          </div>
        );

      case 'full-page':
        return (
          <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="animate-spin h-12 w-12 text-blue-600 mx-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-800">{displayMessage}</p>
              {showProgress && (
                <div className="mt-4 w-64 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <div className="inline-flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-green-600"></div>
              </div>
              <p className="mt-4 text-slate-600">{displayMessage}</p>
            </div>
          </div>
        );
    }
  };

  return <div className="py-4">{renderContent()}</div>;
}
