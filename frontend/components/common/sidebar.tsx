/**
 * File Purpose: Sidebar navigation component
 * Last Updated: 28 July 2026
 * Dependencies: lucide-react, next/link
 * Related Files: components/common/navbar.tsx, app/layout.tsx
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  BarChart3,
  Activity,
  Settings,
  HelpCircle,
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Wallet, label: 'Portfolio', href: '/portfolio' },
  { icon: TrendingUp, label: 'Trades', href: '/trades' },
  { icon: Activity, label: 'Market', href: '/market' },
  { icon: BarChart3, label: 'Analysis', href: '/analysis' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const workspaceItems = menuItems.filter((item) => item.href !== '/settings');
  const settingsItem = menuItems.find((item) => item.href === '/settings');

  return (
    <aside className="w-14 shrink-0 border-r border-slate-200 bg-white px-1.5 py-3 sm:px-2 md:w-60 md:px-3">
      <nav aria-label="Primary navigation" className="flex h-full flex-col">
        <p className="mb-2 hidden px-3 text-[10px] font-semibold uppercase text-slate-400 md:block">Workspace</p>
        <div className="space-y-1">
        {workspaceItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-10 items-center justify-center gap-3 rounded-md px-2 text-sm font-medium transition-colors md:justify-start md:px-3 ${
                isActive
                  ? 'bg-green-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="sr-only md:not-sr-only">{item.label}</span>
            </Link>
          );
        })}
        </div>

        <div className="mt-auto border-t border-slate-200 pt-3">
          <p className="mb-2 hidden px-3 text-[10px] font-semibold uppercase text-slate-400 md:block">Preferences</p>
          {settingsItem && (() => {
            const Icon = settingsItem.icon;
            const isActive = pathname.startsWith(settingsItem.href);
            return (
              <Link
                href={settingsItem.href}
                title={settingsItem.label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-10 items-center justify-center gap-3 rounded-md px-2 text-sm font-medium transition-colors md:justify-start md:px-3 ${isActive ? 'bg-green-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                <span className="sr-only md:not-sr-only">{settingsItem.label}</span>
              </Link>
            );
          })()}

          <Link
            href="/help"
            title="Help & Support"
            className="mt-1 flex h-10 items-center justify-center gap-3 rounded-md px-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 md:justify-start md:px-3"
          >
            <HelpCircle className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span className="sr-only md:not-sr-only">Help &amp; Support</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
