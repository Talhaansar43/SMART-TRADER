/**
 * File Purpose: Main navigation bar component
 * Last Updated: 28 July 2026
 * Dependencies: lucide-react
 * Related Files: components/common/sidebar.tsx, app/layout.tsx
 */

'use client';

import { Activity, Bell, LogOut } from 'lucide-react';

export function Navbar() {
  return (
    <nav aria-label="Application header" className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between px-3 sm:px-6">
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-800 text-white sm:h-9 sm:w-9">
            <Activity className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="whitespace-nowrap text-sm font-bold text-slate-950 sm:text-base">Smart Trader</h1>
            <p className="hidden text-[10px] font-semibold uppercase text-slate-500 sm:block">Markets &amp; portfolio</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <button type="button" aria-label="Notifications" title="Notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 sm:h-10 sm:w-10">
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" aria-hidden="true" />
          </button>

          <button type="button" aria-label="Account: Admin" className="flex items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-slate-100 sm:px-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 sm:h-8 sm:w-8" aria-hidden="true">A</span>
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">Admin</span>
          </button>

          <button type="button" aria-label="Sign out" title="Sign out" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700 sm:h-10 sm:w-10">
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
