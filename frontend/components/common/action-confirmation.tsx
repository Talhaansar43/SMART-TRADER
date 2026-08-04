/**
 * File Purpose: Action confirmation component for user feedback
 * Last Updated: July 30, 2026
 * Dependencies: lucide-react, animations.css
 * Related Files: components/trades/place-order-form.tsx
 */

'use client';

import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

export type ConfirmationStatus = 'pending' | 'success' | 'error';

interface ActionConfirmationProps {
  status: ConfirmationStatus;
  message?: string;
  description?: string;
  details?: Record<string, string | number>;
  onClose?: () => void;
  autoCloseAfter?: number; // milliseconds
  showIcon?: boolean;
}

export function ActionConfirmation({
  status,
  message,
  description,
  details,
  onClose,
  autoCloseAfter = 5000,
  showIcon = true,
}: ActionConfirmationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoCloseAfter && status !== 'pending') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoCloseAfter);
      return () => clearTimeout(timer);
    }
  }, [autoCloseAfter, status, onClose]);

  if (!isVisible) return null;

  const statusConfig = {
    pending: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-900',
      descColor: 'text-blue-700',
      icon: Clock,
      iconColor: 'text-blue-600',
      title: 'Processing...',
    },
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-900',
      descColor: 'text-green-700',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      title: 'Success!',
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-900',
      descColor: 'text-red-700',
      icon: AlertCircle,
      iconColor: 'text-red-600',
      title: 'Error',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={`p-6 ${config.bgColor} border-2 ${config.borderColor} rounded-lg ${
        status === 'pending' ? 'animate-pulse' : 'animate-slide-in'
      }`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-4">
        {showIcon && (
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
          </div>
        )}

        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${config.textColor}`}>
            {message || config.title}
          </h3>

          {description && (
            <p className={`text-sm ${config.descColor} mt-2`}>{description}</p>
          )}

          {details && Object.keys(details).length > 0 && (
            <div className={`mt-4 space-y-2 text-sm ${config.descColor}`}>
              {Object.entries(details).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActionConfirmation;
