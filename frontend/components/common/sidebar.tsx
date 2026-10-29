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

  return (
    <aside className="w-14 shrink-0 border-r border-slate-200 bg-white p-2 md:w-64 md:p-4">
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-center gap-3 rounded-lg px-2 py-3 font-medium transition-colors md:justify-start md:px-4 ${
                isActive
                  ? 'bg-green-50 text-green-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="sr-only md:not-sr-only">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <hr className="my-6 border-slate-200" />

      <div className="space-y-2">
        <Link
          href="/help"
          className="flex items-center justify-center gap-3 rounded-lg px-2 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 md:justify-start md:px-4"
        >
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only md:not-sr-only">Help &amp; Support</span>
        </Link>
      </div>
    </aside>
  );
}
