/**
 * File Purpose: Toast notification component for success/error messages
 * Last Updated: July 30, 2026
 * Usage: Used with useToast hook for showing notifications
 */

'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps extends Toast {
  onClose: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    descColor: 'text-green-700',
    iconColor: 'text-green-600',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    descColor: 'text-red-700',
    iconColor: 'text-red-600',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    descColor: 'text-yellow-700',
    iconColor: 'text-yellow-600',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    descColor: 'text-blue-700',
    iconColor: 'text-blue-600',
  },
};

export function Toast({ id, type, message, description, duration = 5000, action, onClose }: ToastProps) {
  const config = toastConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div
      className={`flex items-start gap-3 p-4 ${config.bgColor} border ${config.borderColor} rounded-lg shadow-lg animate-slide-in`}
      role="alert"
    >
      <Icon className={`h-5 w-5 ${config.iconColor} mt-0.5 flex-shrink-0`} />
      <div className="flex-1">
        <p className={`font-medium ${config.textColor}`}>{message}</p>
        {description && <p className={`text-sm ${config.descColor} mt-1`}>{description}</p>}
        {action && (
          <button
            onClick={action.onClick}
            className={`text-sm font-medium mt-2 ${config.textColor} hover:underline`}
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className={`flex-shrink-0 ${config.textColor} hover:opacity-70 transition-opacity`}
        aria-label="Close notification"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}

export default Toast;
