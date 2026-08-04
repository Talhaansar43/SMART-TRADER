/**
 * File Purpose: Custom hook for managing toast notifications
 * Last Updated: July 30, 2026
 * Usage: const { showToast, toasts, removeToast } = useToast();
 */

'use client';

import { useState, useCallback } from 'react';
import { Toast, ToastType } from '@/components/common/toast-notification';

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((
    message: string,
    type: ToastType = 'info',
    options?: {
      description?: string;
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = {
      id,
      type,
      message,
      description: options?.description,
      duration: options?.duration,
      action: options?.action,
    };

    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showSuccess = useCallback(
    (message: string, description?: string, duration?: number) => {
      return addToast(message, 'success', { description, duration });
    },
    [addToast]
  );

  const showError = useCallback(
    (message: string, description?: string, duration?: number) => {
      return addToast(message, 'error', { description, duration });
    },
    [addToast]
  );

  const showWarning = useCallback(
    (message: string, description?: string, duration?: number) => {
      return addToast(message, 'warning', { description, duration });
    },
    [addToast]
  );

  const showInfo = useCallback(
    (message: string, description?: string, duration?: number) => {
      return addToast(message, 'info', { description, duration });
    },
    [addToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

export default useToast;
