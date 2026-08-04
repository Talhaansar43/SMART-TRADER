/**
 * File Purpose: Place order form component for executing trades
 * Last Updated: 28 July 2026
 * Dependencies: react-hook-form, zod, lib/hooks.ts
 * Related Files: app/(trades)/page.tsx
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePlaceOrder } from '@/lib/hooks';
import { useState } from 'react';

const orderSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').toUpperCase(),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  orderType: z.enum(['MARKET', 'LIMIT']),
  price: z.number().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface PlaceOrderFormProps {
  onSuccess?: () => void;
}

export function PlaceOrderForm({ onSuccess }: PlaceOrderFormProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      type: 'BUY',
      orderType: 'MARKET',
    },
  });

  const { mutate: placeOrder, isPending } = usePlaceOrder();
  const orderType = watch('orderType');

  const onSubmit = (data: OrderFormData) => {
    placeOrder(data, {
      onSuccess: () => {
        onSuccess?.();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Symbol */}
      <div>
        <label className="block text-sm font-medium text-slate-900">Symbol</label>
        <input
          {...register('symbol')}
          type="text"
          placeholder="e.g., AAPL"
          className="input-field mt-2"
        />
        {errors.symbol && <p className="mt-1 text-sm text-red-600">{errors.symbol.message}</p>}
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-slate-900">Order Type</label>
        <select
          {...register('type')}
          className="input-field mt-2"
        >
          <option value="BUY">Buy</option>
          <option value="SELL">Sell</option>
        </select>
        {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium text-slate-900">Quantity</label>
        <input
          {...register('quantity', { valueAsNumber: true })}
          type="number"
          placeholder="Number of shares"
          className="input-field mt-2"
          min="1"
        />
        {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>}
      </div>

      {/* Order Type */}
      <div>
        <label className="block text-sm font-medium text-slate-900">Order Type</label>
        <select
          {...register('orderType')}
          className="input-field mt-2"
        >
          <option value="MARKET">Market Order</option>
          <option value="LIMIT">Limit Order</option>
        </select>
      </div>

      {/* Price (for Limit orders) */}
      {orderType === 'LIMIT' && (
        <div>
          <label className="block text-sm font-medium text-slate-900">Limit Price</label>
          <input
            {...register('price', { valueAsNumber: true })}
            type="number"
            placeholder="Price per share"
            className="input-field mt-2"
            step="0.01"
            min="0"
          />
          {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full disabled:opacity-50"
      >
        {isPending ? 'Placing Order...' : 'Place Order'}
      </button>
    </form>
  );
}
