/**
 * File Purpose: Notification badge for displaying counts and alerts
 * Last Updated: July 30, 2026
 * Dependencies: lucide-react
 * Related Files: components/common/navbar.tsx
 */

'use client';

import { Bell, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useState } from 'react';

export type NotificationLevel = 'info' | 'warning' | 'error' | 'success';

export interface Notification {
  id: string;
  level: NotificationLevel;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface NotificationBadgeProps {
  count?: number;
  notifications?: Notification[];
  onNotificationClick?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  maxVisibleNotifications?: number;
}

export function NotificationBadge({
  count = 0,
  notifications = [],
  onNotificationClick,
  onMarkAllAsRead,
  maxVisibleNotifications = 5,
}: NotificationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visibleNotifications = notifications.slice(0, maxVisibleNotifications);

  const getIcon = (level: NotificationLevel) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getLevelColor = (level: NotificationLevel) => {
    switch (level) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {visibleNotifications.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {visibleNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      onNotificationClick?.(notification.id);
                      setIsOpen(false);
                    }}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors border-l-4 ${
                      notification.level === 'success'
                        ? 'border-green-500'
                        : notification.level === 'error'
                          ? 'border-red-500'
                          : notification.level === 'warning'
                            ? 'border-yellow-500'
                            : 'border-blue-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getIcon(notification.level)}
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>

                        {notification.action && (
                          <a
                            href={notification.action.href}
                            onClick={(e) => {
                              e.preventDefault();
                              notification.action?.onClick?.();
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
                          >
                            {notification.action.label} →
                          </a>
                        )}
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            )}
          </div>

          {/* View All Link */}
          {notifications.length > maxVisibleNotifications && (
            <div className="p-3 text-center border-t border-slate-200">
              <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all notifications →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBadge;
