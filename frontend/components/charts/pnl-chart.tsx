/**
 * File Purpose: P&L Chart component using Recharts
 * Last Updated: 28 July 2026
 * Dependencies: recharts
 * Related Files: app/(dashboard)/page.tsx
 */

'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const mockPnLData = [
  { date: 'Mon', pnl: 1200 },
  { date: 'Tue', pnl: 1900 },
  { date: 'Wed', pnl: 1600 },
  { date: 'Thu', pnl: 2100 },
  { date: 'Fri', pnl: 2800 },
  { date: 'Sat', pnl: 2500 },
  { date: 'Sun', pnl: 3200 },
];

export function PnLChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={mockPnLData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="pnl"
          stroke="#10b981"
          strokeWidth={2}
          name="P&L ($)"
          dot={{ fill: '#10b981' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
