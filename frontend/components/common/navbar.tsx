/**
 * File Purpose: Main navigation bar component
 * Last Updated: 28 July 2026
 * Dependencies: lucide-react
 * Related Files: components/common/sidebar.tsx, app/layout.tsx
 */

'use client';

import { Menu, Bell, User, LogOut } from 'lucide-react';
import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
            <span className="text-lg font-bold text-white">ST</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Smart Trader</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative rounded-lg p-2 transition-colors hover:bg-slate-100">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
          </button>

          {/* User Menu */}
          <button className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-slate-100">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-blue-600" />
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">Admin</span>
          </button>

          {/* Logout */}
          <button className="rounded-lg p-2 transition-colors hover:bg-slate-100">
            <LogOut className="h-5 w-5 text-slate-600" />
          </button>
        </div>
      </div>
    </nav>
  );
}
