'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface PaperTrade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  signalDate: string;
  createdAt: string;
}

interface PaperBotStatus {
  running: boolean;
  mode: 'PAPER';
  strategy: string;
  symbol: string | null;
  quantity: number | null;
  intervalSeconds: number;
  startingCash: number;
  cash: number;
  equity: number;
  position: {
    quantity: number;
    averageEntryPrice: number;
    lastPrice: number;
    marketValue: number;
    unrealizedPnl: number;
  };
  lastSignal: {
    signal: string;
    reason: string;
    asOf: string;
    source: string;
  } | null;
  lastError: string | null;
  trades: PaperTrade[];
}

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function PaperTradingBot() {
  const [status, setStatus] = useState<PaperBotStatus | null>(null);
  const [symbol, setSymbol] = useState('AAPL');
  const [quantity, setQuantity] = useState(1);
  const [initialCash, setInitialCash] = useState(10000);
  const [intervalSeconds, setIntervalSeconds] = useState(300);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const response = await apiClient.get<PaperBotStatus>('/api/trades/bot/status');
        if (mounted) setStatus(response.data);
      } catch {
        if (mounted) setError('Could not load paper bot status.');
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const startBot = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await apiClient.post<PaperBotStatus>('/api/trades/bot/start', {
        symbol,
        quantity,
        initialCash,
        intervalSeconds,
      });
      setStatus(response.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'Could not start the paper bot.');
    } finally {
      setBusy(false);
    }
  };

  const stopBot = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await apiClient.post<PaperBotStatus>('/api/trades/bot/stop');
      setStatus(response.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'Could not stop the paper bot.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" aria-labelledby="paper-bot-title">
      <div className="card-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="paper-bot-title" className="text-lg font-bold">Automated paper trading</h2>
          <p className="mt-1 text-sm text-slate-600">SMA crossover · simulated orders only</p>
        </div>
        <span className="badge bg-amber-100 text-amber-900">PAPER ONLY</span>
      </div>
      <div className="card-body space-y-5">
        {!status?.running ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="form-field">
              <span>Symbol</span>
              <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} maxLength={12} />
            </label>
            <label className="form-field">
              <span>Shares per entry</span>
              <input type="number" min={1} max={10000} step={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
            </label>
            <label className="form-field">
              <span>Starting paper cash</span>
              <input type="number" min={1} max={1000000} step={100} value={initialCash} onChange={(event) => setInitialCash(Number(event.target.value))} />
            </label>
            <label className="form-field">
              <span>Check interval</span>
              <select value={intervalSeconds} onChange={(event) => setIntervalSeconds(Number(event.target.value))}>
                <option value={300}>5 minutes</option>
                <option value={900}>15 minutes</option>
                <option value={3600}>1 hour</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                className="btn-primary w-full"
                onClick={() => void startBot()}
                disabled={busy || !symbol.trim() || !Number.isInteger(quantity) || quantity < 1 || initialCash <= 0}
              >
                {busy ? 'Starting…' : 'Start paper bot'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">Running {status.symbol} · {status.quantity} shares per entry</p>
                <p className="text-sm text-slate-600">Checks every {Math.round(status.intervalSeconds / 60)} minutes. Only verified price history can trigger a simulated order.</p>
              </div>
              <button className="btn-secondary" onClick={() => void stopBot()} disabled={busy}>
                {busy ? 'Stopping…' : 'Stop bot'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Paper equity" value={currency.format(status.equity)} />
              <Metric label="Available cash" value={currency.format(status.cash)} />
              <Metric label="Position" value={`${status.position.quantity} shares`} />
              <Metric label="Unrealized P&L" value={currency.format(status.position.unrealizedPnl)} />
            </div>
            <p className="text-sm text-slate-600">
              {status.lastSignal
                ? `Latest signal: ${status.lastSignal.signal} · ${status.lastSignal.asOf} · ${status.lastSignal.source}`
                : 'Waiting for verified market history and a new daily signal.'}
            </p>
            {status.lastError && <p role="status" className="text-sm text-amber-800">{status.lastError}</p>}
          </div>
        )}

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <p className="text-xs text-slate-500">
          This simulator does not connect to a brokerage or place real orders. Signals use daily SMA crossovers; market data may be delayed. Stopping the bot does not close its simulated position.
        </p>

        {status?.trades.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Signal date</th>
                  <th className="py-2 pr-3">Side</th>
                  <th className="py-2 pr-3 text-right">Shares</th>
                  <th className="py-2 pr-3 text-right">Simulated price</th>
                  <th className="py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {[...status.trades].reverse().map((trade) => (
                  <tr key={trade.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">{trade.signalDate}</td>
                    <td className={`py-2 pr-3 font-medium ${trade.side === 'BUY' ? 'text-emerald-700' : 'text-rose-700'}`}>{trade.side}</td>
                    <td className="py-2 pr-3 text-right">{trade.quantity}</td>
                    <td className="py-2 pr-3 text-right">{currency.format(trade.price)}</td>
                    <td className="py-2 text-right">{currency.format(trade.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
