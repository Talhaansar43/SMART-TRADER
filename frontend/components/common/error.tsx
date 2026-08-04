/**
 * File Purpose: Enhanced error display component with multiple variants
 * Last Updated: July 30, 2026 (Phase 2 Enhancement)
 * Dependencies: lucide-react, next/link
 * Related Files: pages using Error component
 */

'use client';

import { AlertCircle, RefreshCw, Home, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  message?: string;
  description?: string;
  code?: string | number;
  onRetry?: () => void;
  showRetryButton?: boolean;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  variant?: 'default' | 'inline' | 'page' | 'toast';
  className?: string;
}

export function Error({
  message = 'Something went wrong',
  description,
  code,
  onRetry,
  showRetryButton = true,
  showHomeButton = true,
  showBackButton = false,
  variant = 'default',
  className = '',
}: ErrorProps) {
  // Inline variant - minimal, for use within components
  if (variant === 'inline') {
    return (
      <div className={`flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">{message}</p>
          {description && <p className="text-sm text-red-700 mt-1">{description}</p>}
        </div>
        {showRetryButton && onRetry && (
          <button
            onClick={onRetry}
            className="ml-4 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Toast variant - notification style
  if (variant === 'toast') {
    return (
      <div className={`fixed bottom-4 right-4 max-w-sm p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg ${className}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{message}</p>
            {description && <p className="text-sm text-red-700 mt-1">{description}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Page variant - full page error
  if (variant === 'page') {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4 ${className}`}>
        <div className="max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-100 rounded-full">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">{message}</h1>
          {code && <p className="text-lg font-semibold text-slate-600 mb-2">Error Code: {code}</p>}
          {description && <p className="text-slate-600 mb-8">{description}</p>}

          <div className="flex flex-col gap-3">
            {showRetryButton && onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
                Try Again
              </button>
            )}

            <div className="flex gap-3">
              {showBackButton && (
                <button
                  onClick={() => window.history.back()}
                  className="flex items-center justify-center gap-2 flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Go Back
                </button>
              )}

              {showHomeButton && (
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              )}
            </div>
          </div>

          {code && (
            <p className="text-xs text-slate-500 mt-6">
              If this problem persists, please contact support with error code: {code}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Default variant - card style error (backward compatible)
  return (
    <div className={`p-6 bg-red-50 border-2 border-red-200 rounded-lg ${className}`}>
      <div className="flex items-start gap-4">
        <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900">{message}</h3>
          {code && <p className="text-sm text-red-700 mt-1">Error Code: {code}</p>}
          {description && <p className="text-red-700 mt-2">{description}</p>}

          <div className="flex gap-3 mt-4">
            {showRetryButton && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            )}

            {showBackButton && (
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Go Back
              </button>
            )}

            {showHomeButton && (
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-100 transition-colors"
              >
                <Home className="h-4 w-4" />
                Home
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
