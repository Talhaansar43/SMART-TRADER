/**
 * File Purpose: Trading execution page - place orders and manage active trades
 * Last Updated: 28 July 2026
 * Dependencies: lib/hooks.ts, components/trades/*
 * Related Files: app/layout.tsx, components/trades/*
 */

'use client';

import { useState } from 'react';
import { PlaceOrderForm } from '@/components/trades/place-order-form';
import { ActiveOrders } from '@/components/trades/active-orders';
import { useTradeHistory } from '@/lib/hooks';
import { Loading } from '@/components/common/loading';
import { Error } from '@/components/common/error';
import { SkeletonLoader } from '@/components/common/skeleton-loader';

export default function TradesPage() {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const { data: trades, isLoading, error } = useTradeHistory();

  // Show skeletons while loading
  if (isLoading && !trades) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Trading</h1>
            <p className="mt-2 text-slate-600">Execute trades and manage your orders</p>
          </div>
          <button className="btn-primary" disabled>+ Place Order</button>
        </div>

        {/* Skeleton for Active Orders */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold">Active Orders</h2>
            <span className="badge">0</span>
          </div>
          <div className="card-body">
            <SkeletonLoader variant="table-row" count={3} />
          </div>
        </div>

        {/* Skeleton for Order History */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold">Order History</h2>
          </div>
          <div className="card-body">
            <SkeletonLoader variant="table-row" count={5} />
          </div>
        </div>
      </div>
    );
  }

  if (error) return <Error message="Failed to load trades data" />;

  const activeTrades = trades?.filter((t: any) => t.status === 'PENDING') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Trading</h1>
          <p className="mt-2 text-slate-600">Execute trades and manage your orders</p>
        </div>
        <button
          onClick={() => setShowOrderForm(!showOrderForm)}
          className="btn-primary"
        >
          {showOrderForm ? 'Cancel' : '+ Place Order'}
        </button>
      </div>

      {/* Place Order Form */}
      {showOrderForm && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-bold">Place New Order</h2>
          </div>
          <div className="card-body">
            <PlaceOrderForm onSuccess={() => setShowOrderForm(false)} />
          </div>
        </div>
      )}

      {/* Active Orders */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-bold">Active Orders</h2>
          <span className="badge">{activeTrades.length}</span>
        </div>
        <div className="card-body">
          <ActiveOrders orders={activeTrades} />
        </div>
      </div>

      {/* Order History */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-bold">Order History</h2>
        </div>
        <div className="card-body">
          {trades && trades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Symbol</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-right">Quantity</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade: any) => (
                    <tr key={trade.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-2">{new Date(trade.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2 font-semibold">{trade.symbol}</td>
                      <td className="px-4 py-2">
                        <span className={`badge ${trade.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{trade.quantity}</td>
                      <td className="px-4 py-2 text-right">${trade.price.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <span className={`badge ${
                          trade.status === 'EXECUTED' ? 'bg-green-100 text-green-800' :
                          trade.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No trades yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
