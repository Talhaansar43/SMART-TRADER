/**
 * File Purpose: Active orders display component
 * Last Updated: 28 July 2026
 * Dependencies: types/index.ts
 * Related Files: app/(trades)/page.tsx
 */

'use client';

import { Order } from '@/types';
import { X } from 'lucide-react';

// Mock data for active orders
const mockOrders: Order[] = [
  {
    id: '1',
    symbol: 'AAPL',
    type: 'BUY',
    quantity: 50,
    price: 150,
    orderType: 'LIMIT',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    symbol: 'GOOGL',
    type: 'SELL',
    quantity: 10,
    orderType: 'MARKET',
    status: 'PLACED',
    createdAt: new Date().toISOString(),
  },
];

export function ActiveOrders({ orders = mockOrders }: { orders?: Order[] }) {
  const displayOrders = orders.length > 0 ? orders : mockOrders;
  
  if (displayOrders.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        No active orders. Place an order to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayOrders.map((order) => (
        <div key={order.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-medium text-slate-900">{order.symbol}</p>
              <p className="text-sm text-slate-600">
                {order.type} {order.quantity} shares @ ${order.price || 'Market'}
              </p>
            </div>
            <div>
              <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                order.status === 'PLACED' ? 'bg-blue-100 text-blue-700' :
                'bg-green-100 text-green-700'
              }`}>
                {order.status}
              </span>
            </div>
          </div>
          <button className="rounded-lg p-2 transition-colors hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>
      ))}
    </div>
  );
}
