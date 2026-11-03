'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface PaperTrade {
  id: number;
  runId: number;
  symbol: string;
  assetType: 'STOCK' | 'CRYPTO';
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  fee: number;
  realizedPnl: number | null;
  reason: string;
  signalDate: string;
  createdAt: string;
}

interface PaperPosition {
  symbol: string;
  assetType: 'STOCK' | 'CRYPTO';
  quantity: number;
  averageEntryPrice: number;
  lastPrice: number;
  stopPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPct: number | null;
  entryDate: string;
  reason: string;
}

interface PaperBotStatus {
  running: boolean;
  runId: number | null;
  runCount: number;
  persistence: { path: string; saved: boolean };
  strategyInfo: { name: string; rules: string[] };
  checking: boolean;
  checks: number;
  startedAt: string | null;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  intervalSeconds: number;
  maxPositions: number;
  startingCash: number;
  cash: number;
  equity: number;
  returnPct: number | null;
  realizedPnl: number;
  unrealizedPnl: number;
  stats: { closed?: number; wins?: number; losses?: number; winRate?: number | null; avgWin?: number | null; avgLoss?: number | null };
  regime: Record<string, { symbol: string; on: boolean; close: number; sma200: number }>;
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
  positions: PaperPosition[];
  trades: PaperTrade[];
  events: { time: string; level: 'info' | 'warn' | 'trade'; message: string }[];
  lastError: string | null;
}

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function price(value: number) {
  return value >= 1 ? currency.format(value) : `$${value.toPrecision(4)}`;
}

function units(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function percent(value: number | null | undefined) {
  return value == null ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
}

function tone(value: number | null | undefined) {
  return value == null ? 'text-slate-900' : value >= 0 ? 'text-emerald-700' : 'text-rose-700';
}

function countdown(target: string, now: number) {
  const seconds = Math.max(0, Math.round((new Date(target).getTime() - now) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function csvCell(value: string | number | null) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function PaperTradingBot() {
  const [status, setStatus] = useState<PaperBotStatus | null>(null);
  const [initialCash, setInitialCash] = useState(1000);
  const [maxPositions, setMaxPositions] = useState(5);
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
        if (mounted) {
          setStatus(response.data);
          setError('');
        }
      } catch {
        if (mounted) setError('Could not reach the backend. If it is restarting, the saved trades will reappear in a moment.');
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const call = async (path: string, body?: object) => {
    setBusy(true);
    setError('');
    try {
      const response = await apiClient.post<PaperBotStatus>(path, body);
      setStatus(response.data);
    } catch (requestError: any) {
      const detail = requestError.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'The request failed.');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    const response = await apiClient.get<PaperTrade[]>('/api/trades/bot/trades?limit=5000');
    const header = ['time', 'run', 'symbol', 'side', 'quantity', 'price', 'total', 'fee', 'realized_pnl', 'reason'];
    const rows = response.data.map((trade) =>
      [trade.createdAt, trade.runId, trade.symbol, trade.side, trade.quantity, trade.price, trade.total, trade.fee, trade.realizedPnl, trade.reason].map(csvCell).join(','),
    );
    const url = URL.createObjectURL(new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'paper-trades.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasRun = status?.runId != null;
  const universe = status?.universe;

  return (
    <section className="card" aria-labelledby="paper-bot-title">
      <div className="card-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="paper-bot-title" className="text-lg font-bold">Automated paper trading</h2>
          <p className="mt-1 text-sm text-slate-600">{status?.strategyInfo.name ?? 'Trend Breakout'} · S&P 500 stocks and major crypto · simulated orders only</p>
        </div>
        <div className="flex gap-2">
          <span className="badge bg-emerald-100 text-emerald-900" title={status?.persistence.path}>HISTORY SAVED TO DISK</span>
          <span className="badge bg-amber-100 text-amber-900">PAPER ONLY</span>
        </div>
      </div>
      <div className="card-body space-y-5">
        <details className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700" open={!hasRun}>
          <summary className="cursor-pointer font-semibold text-slate-900">How the strategy decides</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {(status?.strategyInfo.rules ?? []).map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Backtests on past data are encouraging but not a promise: trend systems win only about a third of their trades and can fall 30–45% from a peak before recovering.
          </p>
        </details>

        {status?.running ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">Run #{status.runId} is running · {universe?.total ?? 0} symbols ({universe?.stocks ?? 0} stocks, {universe?.crypto ?? 0} crypto)</p>
              <p className="text-sm text-slate-600">Every {status.intervalSeconds}s it scans the next {universe?.batchSize ?? 8} symbols. It keeps running through backend restarts.</p>
            </div>
            <button className="btn-secondary" onClick={() => void call('/api/trades/bot/stop')} disabled={busy}>
              {busy ? 'Stopping…' : 'Stop bot'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="form-field">
                <span>Starting paper cash (USD)</span>
                <input type="number" min={1} step={100} value={initialCash} onChange={(event) => setInitialCash(Number(event.target.value))} />
              </label>
              <label className="form-field">
                <span>Max open positions</span>
                <input type="number" min={1} max={50} step={1} value={maxPositions} onChange={(event) => setMaxPositions(Number(event.target.value))} />
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
                onClick={() => void call('/api/trades/bot/start', { initialCash, maxPositions, intervalSeconds, includeStocks, includeCrypto })}
                disabled={busy || !(includeStocks || includeCrypto) || initialCash <= 0 || !Number.isInteger(maxPositions) || maxPositions < 1}
              >
                {busy ? 'Starting…' : hasRun ? 'Start a new run' : 'Start paper bot'}
              </button>
            </div>
            {hasRun && <p className="text-xs text-slate-500">A new run starts with fresh cash. Earlier runs and all their trades stay in the history below.</p>}
          </div>
        )}

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {status?.lastError && <p role="status" className="text-sm text-amber-800">{status.lastError}</p>}

        {hasRun && status && (
          <>
            <div>
              <p className="mb-2 text-xs text-slate-500">
                Run #{status.runId} of {status.runCount} · started {status.startedAt ? new Date(status.startedAt).toLocaleString() : '—'} · {status.running ? 'running' : 'stopped'}
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Metric label={`Equity (started ${currency.format(status.startingCash)})`} value={currency.format(status.equity)} />
                <Metric label="Return vs start" value={percent(status.returnPct)} className={tone(status.returnPct)} />
                <Metric label="Cash" value={currency.format(status.cash)} />
                <Metric label="Realized P&L" value={currency.format(status.realizedPnl)} className={tone(status.realizedPnl)} />
                <Metric label="Unrealized P&L" value={currency.format(status.unrealizedPnl)} className={tone(status.unrealizedPnl)} />
                <Metric
                  label="Win rate (closed)"
                  value={status.stats.closed ? `${Math.round((status.stats.winRate ?? 0) * 100)}% of ${status.stats.closed}` : 'No closed trades yet'}
                />
              </div>
            </div>

            {status.running && universe && (
              <div className="space-y-1" role="status">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span className={`h-2.5 w-2.5 rounded-full ${status.checking ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
                  {status.checking
                    ? `Scanning: ${universe.currentBatch.join(', ')}…`
                    : universe.total === 0
                      ? 'Loading the symbol list…'
                      : `Ticks: ${status.checks}${status.lastCheckedAt ? ` · last ${new Date(status.lastCheckedAt).toLocaleTimeString()}` : ''}${status.nextCheckAt ? ` · next in ${countdown(status.nextCheckAt, now)}` : ''}`}
                </div>
                <div className="h-2 overflow-hidden rounded bg-slate-200">
                  <div className="h-full bg-emerald-600 transition-all" style={{ width: `${universe.total ? (universe.scannedThisPass / universe.total) * 100 : 0}%` }} />
                </div>
                <p className="text-xs text-slate-600">
                  Pass {universe.pass}: {universe.scannedThisPass} / {universe.total} scanned · {universe.uptrend} above their 200-day average · {universe.downtrend} below · {universe.unavailable} unavailable
                </p>
              </div>
            )}

            {Object.keys(status.regime).length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(status.regime).map(([kind, regime]) => (
                  <span key={kind} className={`rounded-full px-3 py-1 font-medium ${regime.on ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}`}>
                    {kind === 'STOCK' ? 'Stocks' : 'Crypto'} market filter {regime.on ? 'ON' : 'OFF'}: {regime.symbol} {price(regime.close)} vs 200-day {price(regime.sma200)}
                    {regime.on ? ' · new buys allowed' : ' · new buys paused'}
                  </span>
                ))}
              </div>
            )}

            {status.positions.length > 0 && (
              <div className="overflow-x-auto">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Open positions ({status.positions.length} of {status.maxPositions})</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-3">Symbol</th>
                      <th className="py-2 pr-3 text-right">Quantity</th>
                      <th className="py-2 pr-3 text-right">Entry</th>
                      <th className="py-2 pr-3 text-right">Last</th>
                      <th className="py-2 pr-3 text-right">Stop</th>
                      <th className="py-2 text-right">Unrealized P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.positions.map((position) => (
                      <tr key={position.symbol} className="border-b align-top last:border-0">
                        <td className="py-2 pr-3">
                          <span className="font-medium">{position.symbol}</span>
                          <p className="mt-1 max-w-xl text-xs font-normal text-slate-500">Why bought: {position.reason.replace(`BUY ${position.symbol}: `, '')}</p>
                        </td>
                        <td className="py-2 pr-3 text-right">{units(position.quantity)}</td>
                        <td className="py-2 pr-3 text-right">{price(position.averageEntryPrice)}</td>
                        <td className="py-2 pr-3 text-right">{price(position.lastPrice)}</td>
                        <td className="py-2 pr-3 text-right">{price(position.stopPrice)}</td>
                        <td className={`py-2 text-right ${tone(position.unrealizedPnl)}`}>
                          {currency.format(position.unrealizedPnl)} <span className="text-xs">({percent(position.unrealizedPct)})</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="overflow-x-auto">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Trade history (all runs, saved to disk)</h3>
            {status && status.trades.length > 0 && (
              <button className="btn-secondary text-xs" onClick={() => void exportCsv()}>Export CSV</button>
            )}
          </div>
          {status && status.trades.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Run</th>
                  <th className="py-2 pr-3">Symbol</th>
                  <th className="py-2 pr-3">Side</th>
                  <th className="py-2 pr-3 text-right">Quantity</th>
                  <th className="py-2 pr-3 text-right">Price</th>
                  <th className="py-2 pr-3 text-right">P&L</th>
                  <th className="py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {status.trades.map((trade) => (
                  <tr key={trade.id} className="border-b align-top last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3 text-xs text-slate-600">{new Date(trade.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-3">#{trade.runId}</td>
                    <td className="py-2 pr-3 font-medium">{trade.symbol}</td>
                    <td className={`py-2 pr-3 font-medium ${trade.side === 'BUY' ? 'text-emerald-700' : 'text-rose-700'}`}>{trade.side}</td>
                    <td className="py-2 pr-3 text-right">{units(trade.quantity)}</td>
                    <td className="py-2 pr-3 text-right">{price(trade.price)}</td>
                    <td className={`py-2 pr-3 text-right ${trade.realizedPnl == null ? 'text-slate-400' : tone(trade.realizedPnl)}`}>
                      {trade.realizedPnl == null ? '—' : currency.format(trade.realizedPnl)}
                    </td>
                    <td className="min-w-[320px] py-2 text-xs text-slate-700">{trade.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">
              No trades yet. The bot buys only on a confirmed breakout while the market filter is on, so it can take a while; every scan and decision is in the activity log below.
            </p>
          )}
        </div>

        {status && status.events.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Activity log</h3>
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded border border-slate-200 p-2 text-xs">
              {status.events.map((event, index) => (
                <li key={`${event.time}-${index}`} className={event.level === 'trade' ? 'font-semibold text-emerald-800' : event.level === 'warn' ? 'text-amber-800' : 'text-slate-700'}>
                  <span className="mr-2 text-slate-400">{new Date(event.time).toLocaleTimeString()}</span>
                  {event.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-slate-500">
          This simulator does not connect to a brokerage or place real orders. Prices come from Yahoo Finance and can be delayed; fills are simulated at the last scanned price with a 0.1% fee. Stopping the bot keeps its open positions.
        </p>
      </div>
    </section>
  );
}

function Metric({ label, value, className = 'text-slate-900' }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 font-semibold ${className}`}>{value}</p>
    </div>
  );
}
