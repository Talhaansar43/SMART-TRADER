'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface PaperTrade {
  id: string;
  symbol: string;
  assetType: 'STOCK' | 'CRYPTO';
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  realizedPnl: number | null;
  signalDate: string;
  createdAt: string;
}

interface PaperPosition {
  symbol: string;
  assetType: 'STOCK' | 'CRYPTO';
  quantity: number;
  averageEntryPrice: number;
  lastPrice: number;
  marketValue: number;
  unrealizedPnl: number;
}

interface PaperBotStatus {
  running: boolean;
  mode: 'PAPER';
  strategy: string;
  intervalSeconds: number;
  positionSize: number;
  maxPositions: number;
  startingCash: number;
  cash: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  positions: PaperPosition[];
  universe: {
    total: number;
    stocks: number;
    crypto: number;
    pass: number;
    scannedThisPass: number;
    batchSize: number;
    currentBatch: string[];
    uptrend: number;
    downtrend: number;
    unavailable: number;
  };
  lastError: string | null;
  trades: PaperTrade[];
  strategyInfo: { name: string; fastWindow: number; slowWindow: number; rules: string[] };
  checking: boolean;
  checks: number;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  events: { time: string; level: 'info' | 'warn' | 'trade'; message: string }[];
}

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function PaperTradingBot() {
  const [status, setStatus] = useState<PaperBotStatus | null>(null);
  const [positionSize, setPositionSize] = useState(1000);
  const [maxPositions, setMaxPositions] = useState(20);
  const [initialCash, setInitialCash] = useState(50000);
  const [intervalSeconds, setIntervalSeconds] = useState(10);
  const [includeStocks, setIncludeStocks] = useState(true);
  const [includeCrypto, setIncludeCrypto] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
    const timer = window.setInterval(() => void refresh(), 3000);
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
        positionSize,
        maxPositions,
        initialCash,
        intervalSeconds,
        includeStocks,
        includeCrypto,
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
          <p className="mt-1 text-sm text-slate-600">S&P 500 stocks and major crypto · SMA crossover · simulated orders only</p>
        </div>
        <span className="badge bg-amber-100 text-amber-900">PAPER ONLY</span>
      </div>
      <div className="card-body space-y-5">
        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Strategy: {status?.strategyInfo.name ?? 'SMA 20/50 crossover (long only)'}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {(status?.strategyInfo.rules ?? []).map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
        {!status?.running ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="form-field">
                <span>Paper cash per position (USD)</span>
                <input type="number" min={1} step={100} value={positionSize} onChange={(event) => setPositionSize(Number(event.target.value))} />
              </label>
              <label className="form-field">
                <span>Max open positions</span>
                <input type="number" min={1} max={600} step={1} value={maxPositions} onChange={(event) => setMaxPositions(Number(event.target.value))} />
              </label>
              <label className="form-field">
                <span>Starting paper cash (USD)</span>
                <input type="number" min={1} step={1000} value={initialCash} onChange={(event) => setInitialCash(Number(event.target.value))} />
              </label>
              <label className="form-field">
                <span>Tick interval</span>
                <select value={intervalSeconds} onChange={(event) => setIntervalSeconds(Number(event.target.value))}>
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={300}>5 minutes</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={includeStocks} onChange={(event) => setIncludeStocks(event.target.checked)} />
                S&P 500 stocks
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={includeCrypto} onChange={(event) => setIncludeCrypto(event.target.checked)} />
                Crypto (top 18 USD pairs)
              </label>
              <button
                className="btn-primary"
                onClick={() => void startBot()}
                disabled={
                  busy
                  || !(includeStocks || includeCrypto)
                  || positionSize <= 0
                  || positionSize > initialCash
                  || !Number.isInteger(maxPositions)
                  || maxPositions < 1
                }
              >
                {busy ? 'Starting…' : 'Start paper bot'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">
                  Scanning {status.universe.total} symbols ({status.universe.stocks} stocks, {status.universe.crypto} crypto)
                </p>
                <p className="text-sm text-slate-600">
                  {currency.format(status.positionSize)} per position, up to {status.maxPositions} open. Every {status.intervalSeconds}s it scans the next {status.universe.batchSize} symbols.
                </p>
              </div>
              <button className="btn-secondary" onClick={() => void stopBot()} disabled={busy}>
                {busy ? 'Stopping…' : 'Stop bot'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Paper equity" value={currency.format(status.equity)} />
              <Metric label="Available cash" value={currency.format(status.cash)} />
              <Metric label="Unrealized P&L" value={currency.format(status.unrealizedPnl)} />
              <Metric label="Realized P&L" value={currency.format(status.realizedPnl)} />
            </div>
            <div className="space-y-1" role="status">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className={`h-2.5 w-2.5 rounded-full ${status.checking ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
                {status.checking
                  ? `Scanning: ${status.universe.currentBatch.join(', ')}…`
                  : status.universe.total === 0
                    ? 'Loading the symbol list…'
                    : `Ticks: ${status.checks}${status.lastCheckedAt ? ` · last ${new Date(status.lastCheckedAt).toLocaleTimeString()}` : ''}${status.nextCheckAt ? ` · next in ${formatCountdown(status.nextCheckAt, now)}` : ''}`}
              </div>
              <div className="h-2 overflow-hidden rounded bg-slate-200">
                <div
                  className="h-full bg-emerald-600 transition-all"
                  style={{ width: `${status.universe.total ? (status.universe.scannedThisPass / status.universe.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-600">
                Pass {status.universe.pass}: {status.universe.scannedThisPass} / {status.universe.total} scanned · {status.universe.uptrend} in uptrend · {status.universe.downtrend} in downtrend · {status.universe.unavailable} unavailable
              </p>
            </div>
            <p className="text-sm text-slate-600">
              {status.trades.length
                ? `${status.trades.length} simulated trade(s) so far.`
                : 'No trades yet. A symbol only trades on the day its averages cross, so the first trades appear as the scan covers the list.'}
            </p>
            {status.lastError && <p role="status" className="text-sm text-amber-800">{status.lastError}</p>}
          </div>
        )}

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <p className="text-xs text-slate-500">
          This simulator does not connect to a brokerage or place real orders. Signals use daily SMA crossovers; market data may be delayed. Stopping the bot does not close its simulated positions.
        </p>

        {status?.positions.length ? (
          <div className="overflow-x-auto">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Open positions ({status.positions.length})</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Symbol</th>
                  <th className="py-2 pr-3 text-right">Quantity</th>
                  <th className="py-2 pr-3 text-right">Entry</th>
                  <th className="py-2 pr-3 text-right">Last</th>
                  <th className="py-2 text-right">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody>
                {status.positions.map((position) => (
                  <tr key={position.symbol} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{position.symbol}</td>
                    <td className="py-2 pr-3 text-right">{position.quantity}</td>
                    <td className="py-2 pr-3 text-right">{currency.format(position.averageEntryPrice)}</td>
                    <td className="py-2 pr-3 text-right">{currency.format(position.lastPrice)}</td>
                    <td className={`py-2 text-right ${position.unrealizedPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{currency.format(position.unrealizedPnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {status?.trades.length ? (
          <div className="overflow-x-auto">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Simulated trades</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Signal date</th>
                  <th className="py-2 pr-3">Symbol</th>
                  <th className="py-2 pr-3">Side</th>
                  <th className="py-2 pr-3 text-right">Quantity</th>
                  <th className="py-2 pr-3 text-right">Simulated price</th>
                  <th className="py-2 pr-3 text-right">Value</th>
                  <th className="py-2 text-right">Realized P&L</th>
                </tr>
              </thead>
              <tbody>
                {[...status.trades].reverse().map((trade) => (
                  <tr key={trade.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">{trade.signalDate}</td>
                    <td className="py-2 pr-3 font-medium">{trade.symbol}</td>
                    <td className={`py-2 pr-3 font-medium ${trade.side === 'BUY' ? 'text-emerald-700' : 'text-rose-700'}`}>{trade.side}</td>
                    <td className="py-2 pr-3 text-right">{trade.quantity}</td>
                    <td className="py-2 pr-3 text-right">{currency.format(trade.price)}</td>
                    <td className="py-2 pr-3 text-right">{currency.format(trade.total)}</td>
                    <td className={`py-2 text-right ${trade.realizedPnl == null ? 'text-slate-400' : trade.realizedPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{trade.realizedPnl == null ? '—' : currency.format(trade.realizedPnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {status?.events.length ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Activity log</h3>
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded border border-slate-200 p-2 text-xs">
              {[...status.events].reverse().map((event, index) => (
                <li key={`${event.time}-${index}`} className={event.level === 'trade' ? 'font-semibold text-emerald-800' : event.level === 'warn' ? 'text-amber-800' : 'text-slate-700'}>
                  <span className="mr-2 text-slate-400">{new Date(event.time).toLocaleTimeString()}</span>
                  {event.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function formatCountdown(target: string, now: number) {
  const seconds = Math.max(0, Math.round((new Date(target).getTime() - now) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
