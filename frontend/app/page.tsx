/**
 * File Purpose: Root page - redirects to dashboard
 * Last Updated: 28 July 2026
 * Dependencies: next/navigation
 * Related Files: app/dashboard/page.tsx
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Smart Trader</h1>
        <p className="text-slate-600 mt-2">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}