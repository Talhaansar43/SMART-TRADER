/**
 * File Purpose: Holdings Distribution Pie Chart
 * Last Updated: 28 July 2026
 * Dependencies: recharts
 * Related Files: app/(dashboard)/page.tsx
 */

'use client';

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const mockHoldingsData = [
  { name: 'AAPL', value: 35 },
  { name: 'GOOGL', value: 25 },
  { name: 'MSFT', value: 20 },
  { name: 'AMZN', value: 15 },
  { name: 'Cash', value: 5 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function HoldingsDistribution() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={mockHoldingsData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {mockHoldingsData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}%`} />
      </PieChart>
    </ResponsiveContainer>
  );
}
