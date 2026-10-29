'use client';

import { FormEvent, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface PriceHistoryPoint {
  date: string;
  close: number;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
}

interface StockAnalysis {
  symbol: string;
  status: 'EVALUATED' | 'NOT_EVALUATED';
  reason: string | null;
  source: string | null;
  mock: boolean | null;
  barsUsed: number;
  asOf: string | null;
  evaluatedAt: string;
  price: number | null;
  priceHistory: PriceHistoryPoint[];
  performancePct: Record<string, number | null>;
  trend: {
    bias: string;
    movingAverages: Record<string, number | null>;
    priceVsSma20Pct: number | null;
    priceVsSma50Pct: number | null;
    priceVsSma200Pct: number | null;
    crossover: string;
  } | null;
  momentum: {
    rsi14: number | null;
    rsiState: string | null;
    macd: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
  } | null;
  risk: {
    annualizedVolatilityPct: number | null;
    maxDrawdownPct: number | null;
    high52Week: number | null;
    low52Week: number | null;
    averageVolume20: number | null;
    latestVolume: number | null;
    volumeVsAverage20Pct: number | null;
  } | null;
  company: Record<string, unknown> | null;
  fundamentals: Record<string, number | string | null> | null;
  quote: {
    currentPrice?: number;
    previousClose?: number;
    dataTimestamp?: string | null;
    source?: string;
    mock?: boolean;
  } | null;
}

const QUICK_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL'];
const FUNDAMENTAL_FIELDS = [
  ['peTTM', 'P/E (TTM)'],
  ['epsTTM', 'EPS (TTM)'],
  ['beta', 'Beta'],
  ['dividendYieldIndicatedAnnual', 'Dividend yield'],
  ['roeTTM', 'Return on equity'],
  ['revenueGrowthTTMYoy', 'Revenue growth (YoY)'],
  ['52WeekHigh', '52-week high'],
  ['52WeekLow', '52-week low'],
] as const;

function formatNumber(value: number | null | undefined, digits = 2) {
  return value == null || !Number.isFinite(value)
    ? 'Unavailable'
    : value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatPercent(value: number | null | undefined) {
  return value == null ? 'Unavailable' : `${value > 0 ? '+' : ''}${formatNumber(value)}%`;
}

function formatMetric(value: number | string | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) return formatNumber(value);
  return value == null ? 'Unavailable' : String(value);
}

export default function AnalysisPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  async function handleEvaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsEvaluating(true);
    setError(null);
    setAnalysis(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiUrl}/api/analysis/stocks/analyze?symbol=${encodeURIComponent(symbol.trim())}`
      );
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail ?? `Analysis request failed (${response.status})`);
      }
      setAnalysis(await response.json());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Analysis request failed');
    } finally {
      setIsEvaluating(false);
    }
  }

  const verified = analysis?.status === 'EVALUATED' && analysis.mock === false;
  const quoteAvailable = analysis?.quote?.source === 'finnhub' && analysis.quote.mock === false;
  const companyName = typeof analysis?.company?.name === 'string' ? analysis.company.name : analysis?.symbol;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Research desk</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Stock analysis</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Technical history, momentum, risk, and company metrics from the available market feed.</p>
        </div>
        <form onSubmit={handleEvaluate} className="flex w-full gap-2 sm:w-auto">
          <label htmlFor="analysis-symbol" className="sr-only">Stock symbol</label>
          <input
            id="analysis-symbol"
            name="symbol"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            maxLength={12}
            required
            autoComplete="off"
            placeholder="Enter symbol"
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:w-44 sm:flex-none"
          />
          <button
            type="submit"
            disabled={isEvaluating || !symbol.trim()}
            className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
          >
            {isEvaluating ? 'Loading...' : 'Analyze'}
          </button>
        </form>
      </header>

      <div className="flex flex-wrap items-center gap-2" aria-label="Popular symbols">
        <span className="mr-1 text-xs font-medium uppercase text-slate-500">Quick lookup</span>
        {QUICK_SYMBOLS.map((quickSymbol) => (
          <button
            key={quickSymbol}
            type="button"
            onClick={() => setSymbol(quickSymbol)}
            className={`rounded border px-2.5 py-1 text-xs font-semibold transition-colors ${symbol === quickSymbol ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-700'}`}
          >
            {quickSymbol}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p>}
      {isEvaluating && <div role="status" className="border-y border-slate-200 py-8 text-center text-sm text-slate-600">Fetching market history and company data...</div>}

      {analysis && (
        <div aria-live="polite" className="space-y-5">
          <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-slate-500">{analysis.symbol}{analysis.company?.exchange ? ` · ${analysis.company.exchange}` : ''}{analysis.company?.finnhubIndustry ? ` · ${analysis.company.finnhubIndustry}` : ''}</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">{companyName}</h2>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-semibold tabular-nums text-slate-950">{verified && analysis.price != null ? formatNumber(analysis.price) : quoteAvailable ? formatNumber(analysis.quote?.currentPrice) : 'Price unavailable'}</span>
                {quoteAvailable && analysis.quote?.previousClose && analysis.quote.currentPrice && (
                  <span className={`text-sm font-medium ${analysis.quote.currentPrice >= analysis.quote.previousClose ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatPercent((analysis.quote.currentPrice / analysis.quote.previousClose - 1) * 100)} today
                  </span>
                )}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className={`inline-flex rounded px-2.5 py-1 text-xs font-semibold ${verified ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                {verified ? `${analysis.source?.toUpperCase()} · VERIFIED HISTORY` : quoteAvailable ? 'FINNHUB QUOTE · HISTORY UNAVAILABLE' : 'VERIFIED DATA UNAVAILABLE'}
              </span>
              <p className="mt-2 text-xs text-slate-500">{analysis.barsUsed} daily candles · Through {analysis.asOf ?? 'unavailable'}</p>
            </div>
          </section>

          {!verified && (
            <p role="status" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {analysis.reason?.replaceAll('_', ' ').toLowerCase() ?? 'The provider did not return verifiable historical data.'} Technical analysis is withheld unless the feed provides real, chronologically valid candles.
            </p>
          )}

          {verified && analysis.trend && analysis.momentum && analysis.risk && (
            <>
              <section aria-label="Returns" className="grid grid-cols-2 border-y border-slate-200 sm:grid-cols-5">
                {Object.entries(analysis.performancePct).map(([period, value]) => (
                  <div key={period} className="border-b border-r border-slate-100 px-4 py-3 last:border-r-0 sm:border-b-0">
                    <p className="text-xs font-medium text-slate-500">{period}</p>
                    <p className={`mt-1 text-lg font-semibold tabular-nums ${value == null ? 'text-slate-400' : value >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatPercent(value)}
                    </p>
                  </div>
                ))}
              </section>

              <section className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
                <div className="min-w-0 border-b border-slate-200 pb-4 lg:border-b-0">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">Price and trend</h3>
                      <p className="mt-1 text-xs text-slate-500">Daily close with 20, 50, and 200-session averages</p>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span className="text-emerald-700">● Close</span><span className="text-sky-700">● SMA 20</span><span className="text-amber-700">● SMA 50</span><span className="text-slate-500">● SMA 200</span>
                    </div>
                  </div>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysis.priceHistory} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} minTickGap={32} tick={{ fontSize: 11 }} />
                        <YAxis domain={['auto', 'auto']} width={66} tickFormatter={(value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 })} tick={{ fontSize: 11 }} />
                        <Tooltip labelFormatter={(value) => `Date: ${value}`} formatter={(value: number, name: string) => [formatNumber(value), name]} />
                        <Line type="monotone" dataKey="close" name="Close" stroke="#047857" strokeWidth={2} dot={false} connectNulls />
                        <Line type="monotone" dataKey="sma20" name="SMA 20" stroke="#0369a1" strokeWidth={1.5} dot={false} connectNulls />
                        <Line type="monotone" dataKey="sma50" name="SMA 50" stroke="#d97706" strokeWidth={1.5} dot={false} connectNulls />
                        <Line type="monotone" dataKey="sma200" name="SMA 200" stroke="#64748b" strokeWidth={1.5} dot={false} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-5">
                  <section>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">Trend</h3>
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${analysis.trend.bias === 'BULLISH' ? 'bg-emerald-100 text-emerald-900' : analysis.trend.bias === 'BEARISH' ? 'bg-rose-100 text-rose-900' : 'bg-slate-100 text-slate-700'}`}>{analysis.trend.bias}</span>
                    </div>
                    <dl className="mt-3 divide-y divide-slate-100 text-sm">
                      {(['20', '50', '200'] as const).map((window) => (
                        <div key={window} className="flex justify-between gap-3 py-2">
                          <dt className="text-slate-600">SMA {window}</dt><dd className="font-medium tabular-nums text-slate-900">{formatNumber(analysis.trend?.movingAverages[window])}</dd>
                        </div>
                      ))}
                      <div className="flex justify-between gap-3 py-2"><dt className="text-slate-600">20/50 cross</dt><dd className="text-right font-medium text-slate-900">{analysis.trend.crossover.replaceAll('_', ' ')}</dd></div>
                    </dl>
                  </section>

                  <section className="border-t border-slate-200 pt-4">
                    <h3 className="font-semibold text-slate-900">Momentum</h3>
                    <dl className="mt-3 divide-y divide-slate-100 text-sm">
                      <div className="flex justify-between gap-3 py-2"><dt className="text-slate-600">RSI (14)</dt><dd className="font-medium text-slate-900">{formatNumber(analysis.momentum.rsi14)} <span className="text-xs text-slate-500">{analysis.momentum.rsiState ?? ''}</span></dd></div>
                      <div className="flex justify-between gap-3 py-2"><dt className="text-slate-600">MACD (12, 26, 9)</dt><dd className="font-medium tabular-nums text-slate-900">{formatNumber(analysis.momentum.macd)}</dd></div>
                      <div className="flex justify-between gap-3 py-2"><dt className="text-slate-600">MACD histogram</dt><dd className="font-medium tabular-nums text-slate-900">{formatNumber(analysis.momentum.macdHistogram)}</dd></div>
                    </dl>
                  </section>
                </div>
              </section>

              <section className="grid gap-5 border-y border-slate-200 py-5 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-slate-900">Risk and range</h3>
                  <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
                    <div><dt className="text-slate-500">Annualized volatility</dt><dd className="mt-1 font-semibold text-slate-900">{formatPercent(analysis.risk.annualizedVolatilityPct)}</dd></div>
                    <div><dt className="text-slate-500">Maximum drawdown</dt><dd className="mt-1 font-semibold text-slate-900">{formatPercent(analysis.risk.maxDrawdownPct)}</dd></div>
                    <div><dt className="text-slate-500">52-week high</dt><dd className="mt-1 font-semibold text-slate-900">{formatNumber(analysis.risk.high52Week)}</dd></div>
                    <div><dt className="text-slate-500">52-week low</dt><dd className="mt-1 font-semibold text-slate-900">{formatNumber(analysis.risk.low52Week)}</dd></div>
                    <div><dt className="text-slate-500">Average volume (20d)</dt><dd className="mt-1 font-semibold text-slate-900">{analysis.risk.averageVolume20?.toLocaleString() ?? 'Unavailable'}</dd></div>
                    <div><dt className="text-slate-500">Volume vs 20d average</dt><dd className="mt-1 font-semibold text-slate-900">{formatPercent(analysis.risk.volumeVsAverage20Pct)}</dd></div>
                  </dl>
                </div>
              </section>
            </>
          )}

          {(analysis.company || analysis.fundamentals) && (
            <section className="border-y border-slate-200 py-5">
              <h3 className="font-semibold text-slate-900">Company fundamentals</h3>
              {analysis.company?.finnhubIndustry && <p className="mt-1 text-sm text-slate-600">{String(analysis.company.finnhubIndustry)}{analysis.company.country ? ` · ${String(analysis.company.country)}` : ''}</p>}
              {analysis.fundamentals ? (
                <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-sm sm:grid-cols-4">
                  {FUNDAMENTAL_FIELDS.map(([key, label]) => (
                    <div key={key}><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-semibold tabular-nums text-slate-900">{formatMetric(analysis.fundamentals?.[key])}{key === 'dividendYieldIndicatedAnnual' || key === 'revenueGrowthTTMYoy' || key === 'roeTTM' ? '%' : ''}</dd></div>
                  ))}
                </dl>
              ) : <p className="mt-3 text-sm text-slate-600">Fundamental metrics are not available from the current provider or plan.</p>}
            </section>
          )}

          <footer className="flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:justify-between">
            <span>Source: {analysis.source ?? 'Unavailable'} · {analysis.barsUsed} candles · As of {analysis.asOf ?? 'unavailable'}</span>
            <span>Calculated {new Date(analysis.evaluatedAt).toLocaleString()}</span>
          </footer>
        </div>
      )}

      <p className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
        Indicators describe historical data; they are not forecasts or investment recommendations. Market data may be delayed, and fundamental fields depend on provider coverage and subscription limits.
      </p>
    </div>
  );
}