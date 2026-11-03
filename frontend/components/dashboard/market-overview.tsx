'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface HistoryBar {
  date: string;
  close: number;
  volume: number;
  high?: number;
  low?: number;
}

interface HistoryResponse {
  data: HistoryBar[];
  source: string;
  mock: boolean;
}

interface BenchmarkDefinition {
  symbol: string;
  name: string;
  color: string;
}

interface BenchmarkData extends BenchmarkDefinition {
  bars: HistoryBar[];
  source: string | null;
  error: string | null;
  close: number | null;
  asOf: string | null;
  change1dPct: number | null;
  change1mPct: number | null;
  change1yPct: number | null;
  priceVsSma50Pct: number | null;
  priceVsSma200Pct: number | null;
  sma50: number | null;
  sma200: number | null;
  high52Week: number | null;
  low52Week: number | null;
  rangePositionPct: number | null;
  rsi14: number | null;
  rsiState: string | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  macdTrend: string | null;
  bollingerLower: number | null;
  bollingerMiddle: number | null;
  bollingerUpper: number | null;
  bollingerPosition: string | null;
  bollingerPercentB: number | null;
  bollingerWidthPct: number | null;
  obvTrend: string | null;
  obvChange20: number | null;
  volatility20dPct: number | null;
  marketRegime: string | null;
  relative1mPct: number | null;
}

interface TrendPoint {
  date: string;
  [symbol: string]: string | number | null;
}

const BENCHMARKS: BenchmarkDefinition[] = [
  { symbol: 'SPY', name: 'S&P 500', color: '#047857' },
  { symbol: 'QQQ', name: 'Nasdaq 100', color: '#0369a1' },
  { symbol: 'DIA', name: 'Dow 30', color: '#d97706' },
  { symbol: 'IWM', name: 'Russell 2000', color: '#be123c' },
];

type TrendRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

const RANGE_OPTIONS: TrendRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y'];
const RANGE_SESSIONS: Record<TrendRange, number> = { '1D': 1, '1W': 5, '1M': 21, '3M': 63, '6M': 126, '1Y': 252 };

interface RangeStats {
  returnPct: number | null;
  positionPct: number | null;
  high: number | null;
  low: number | null;
  volatilityPct: number | null;
  obvChange: number | null;
}

// The window starts at the close before the range so returns match the chart's base.
function calculateRangeStats(bars: HistoryBar[], sessions: number): RangeStats {
  const window = bars.slice(-(sessions + 1));
  if (window.length < 2) {
    return { returnPct: null, positionPct: null, high: null, low: null, volatilityPct: null, obvChange: null };
  }
  const closes = window.map((bar) => Number(bar.close));
  const last = closes[closes.length - 1];
  const high = Math.max(...window.map((bar) => Number(bar.high ?? bar.close)));
  const low = Math.min(...window.map((bar) => Number(bar.low ?? bar.close)));
  const returns = closes.slice(1).map((close, index) => close / closes[index] - 1);
  const returnMean = mean(returns);
  const volatilityPct = returns.length > 1 && returnMean != null
    ? Math.sqrt(returns.reduce((sum, value) => sum + (value - returnMean) ** 2, 0) / (returns.length - 1) * 252) * 100
    : null;
  let obvChange = 0;
  for (let index = 1; index < window.length; index += 1) {
    if (closes[index] > closes[index - 1]) obvChange += Number(window[index].volume);
    else if (closes[index] < closes[index - 1]) obvChange -= Number(window[index].volume);
  }
  return {
    returnPct: (last / closes[0] - 1) * 100,
    positionPct: high > low ? (last - low) / (high - low) * 100 : null,
    high,
    low,
    volatilityPct,
    obvChange,
  };
}

function mean(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function calculateRsi(closes: number[]) {
  const changes = closes.slice(1).map((close, index) => close - closes[index]);
  if (changes.length < 14) return null;
  const gains = changes.map((change) => Math.max(change, 0));
  const losses = changes.map((change) => Math.max(-change, 0));
  let averageGain = mean(gains.slice(0, 14)) ?? 0;
  let averageLoss = mean(losses.slice(0, 14)) ?? 0;
  for (let index = 14; index < changes.length; index += 1) {
    averageGain = (averageGain * 13 + gains[index]) / 14;
    averageLoss = (averageLoss * 13 + losses[index]) / 14;
  }
  return averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
}

function calculateEma(values: number[], period: number) {
  const multiplier = 2 / (period + 1);
  return values.reduce<number[]>((ema, value, index) => {
    ema.push(index === 0 ? value : (value - ema[index - 1]) * multiplier + ema[index - 1]);
    return ema;
  }, []);
}

function returnPct(closes: number[], sessions: number) {
  if (closes.length <= sessions) return null;
  return (closes[closes.length - 1] / closes[closes.length - sessions - 1] - 1) * 100;
}

function analyzeBenchmark(definition: BenchmarkDefinition, history: HistoryResponse): BenchmarkData {
  const verified = history.mock === false && ['finnhub', 'yahoo_finance'].includes(history.source);
  const bars = verified && Array.isArray(history.data) ? history.data : [];
  const closes = bars.map((bar) => Number(bar.close));
  const volumes = bars.map((bar) => Number(bar.volume));
  const close = closes.at(-1) ?? null;
  const sma50 = closes.length >= 50 ? mean(closes.slice(-50)) : null;
  const sma200 = closes.length >= 200 ? mean(closes.slice(-200)) : null;
  const recent20 = closes.slice(-20);
  const bandMean = mean(recent20);
  const bandDeviation = bandMean == null
    ? null
    : Math.sqrt(mean(recent20.map((value) => (value - bandMean) ** 2)) ?? 0);
  const upperBand = bandMean != null && bandDeviation != null ? bandMean + 2 * bandDeviation : null;
  const lowerBand = bandMean != null && bandDeviation != null ? bandMean - 2 * bandDeviation : null;
  const bandWidthPct = bandMean && upperBand != null && lowerBand != null
    ? (upperBand - lowerBand) / bandMean * 100
    : null;
  const fastEma = calculateEma(closes, 12);
  const slowEma = calculateEma(closes, 26);
  const macd = fastEma.map((value, index) => value - slowEma[index]);
  const macdSignal = calculateEma(macd, 9);
  let obv = 0;
  const obvValues = [obv];
  for (let index = 1; index < closes.length; index += 1) {
    if (closes[index] > closes[index - 1]) obv += volumes[index];
    else if (closes[index] < closes[index - 1]) obv -= volumes[index];
    obvValues.push(obv);
  }
  const obvLookback = Math.min(20, Math.max(obvValues.length - 1, 0));
  const obvChange20 = obvValues.at(-1) != null && obvValues.length > obvLookback
    ? obvValues.at(-1)! - obvValues[obvValues.length - obvLookback - 1]
    : null;
  const recentReturns = closes.slice(-21).slice(1).map((value, index) => value / closes.slice(-21)[index] - 1);
  const returnMean = mean(recentReturns);
  const volatility = recentReturns.length > 1 && returnMean != null
    ? Math.sqrt(recentReturns.reduce((sum, value) => sum + (value - returnMean) ** 2, 0) / (recentReturns.length - 1) * 252) * 100
    : null;
  const rsi14 = calculateRsi(closes);
  const macdLine = macd.at(-1) ?? null;
  const macdSignalLine = macdSignal.at(-1) ?? null;
  const macdHistogram = macdLine != null && macdSignalLine != null ? macdLine - macdSignalLine : null;
  const trailingYear = bars.slice(-252);
  const high52Week = trailingYear.length ? Math.max(...trailingYear.map((bar) => Number(bar.high ?? bar.close))) : null;
  const low52Week = trailingYear.length ? Math.min(...trailingYear.map((bar) => Number(bar.low ?? bar.close))) : null;
  const rangePositionPct = close != null && high52Week != null && low52Week != null && high52Week > low52Week
    ? (close - low52Week) / (high52Week - low52Week) * 100
    : null;

  return {
    ...definition,
    bars,
    source: verified ? history.source : null,
    error: verified ? null : 'Verified market history is unavailable',
    close,
    asOf: bars.at(-1)?.date ?? null,
    change1dPct: returnPct(closes, 1),
    change1mPct: returnPct(closes, 21),
    change1yPct: returnPct(closes, 252),
    priceVsSma50Pct: close != null && sma50 ? (close / sma50 - 1) * 100 : null,
    priceVsSma200Pct: close != null && sma200 ? (close / sma200 - 1) * 100 : null,
    sma50,
    sma200,
    high52Week,
    low52Week,
    rangePositionPct,
    rsi14,
    rsiState: rsi14 == null ? null : rsi14 >= 70 ? 'Overbought' : rsi14 <= 30 ? 'Oversold' : 'Neutral',
    macdLine,
    macdSignal: macdSignalLine,
    macdHistogram,
    macdTrend: macdHistogram == null ? null : macdHistogram >= 0 ? 'Positive' : 'Negative',
    bollingerLower: lowerBand,
    bollingerMiddle: bandMean,
    bollingerUpper: upperBand,
    bollingerPosition: close == null || upperBand == null || lowerBand == null
      ? null
      : close > upperBand ? 'Above upper band' : close < lowerBand ? 'Below lower band' : 'Within bands',
    bollingerPercentB: close != null && upperBand != null && lowerBand != null && upperBand > lowerBand
      ? (close - lowerBand) / (upperBand - lowerBand) * 100
      : null,
    bollingerWidthPct: bandWidthPct,
    obvTrend: obvValues.length > 20
      ? obvValues.at(-1)! >= obvValues[obvValues.length - obvLookback - 1] ? 'Rising' : 'Falling'
      : null,
    obvChange20,
    volatility20dPct: volatility,
    marketRegime: close != null && sma50 != null && sma200 != null
      ? close > sma200 && sma50 > sma200 ? 'Broad uptrend'
        : close < sma200 && sma50 < sma200 ? 'Broad downtrend'
        : 'Mixed trend'
      : null,
    relative1mPct: null,
  };
}

async function fetchMarketOverview(): Promise<BenchmarkData[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return Promise.all(BENCHMARKS.map(async (definition) => {
    try {
      const response = await fetch(
        `${apiUrl}/api/market/history?symbol=${definition.symbol}&days=365`
      );
      if (!response.ok) throw new Error(`Market history request failed (${response.status})`);
      const history = await response.json() as HistoryResponse;
      return analyzeBenchmark(definition, history);
    } catch (error) {
      return analyzeBenchmark(definition, { data: [], source: 'unavailable', mock: true });
    }
  }));
}

function formatPrice(value: number | null) {
  return value == null ? 'Unavailable' : value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function formatPct(value: number | null) {
  return value == null ? 'Unavailable' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatCompact(value: number | null) {
  return value == null
    ? 'Unavailable'
    : `${value >= 0 ? '+' : ''}${value.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 })}`;
}

function MarketOverview() {
  const [range, setRange] = useState<TrendRange>('1Y');
  const { data = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard-market-overview'],
    queryFn: fetchMarketOverview,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const verified = data.filter((benchmark) => benchmark.bars.length > 0);
  const sessions = RANGE_SESSIONS[range];
  const withStats = data.map((benchmark) => ({ ...benchmark, stats: calculateRangeStats(benchmark.bars, sessions) }));
  const spyReturn = withStats.find((benchmark) => benchmark.symbol === 'SPY')?.stats.returnPct ?? null;
  const benchmarks = withStats.map((benchmark) => ({
    ...benchmark,
    relativePct: benchmark.stats.returnPct != null && spyReturn != null ? benchmark.stats.returnPct - spyReturn : null,
  }));
  const spy = benchmarks.find((benchmark) => benchmark.symbol === 'SPY');
  const breadth50 = verified.filter((benchmark) => (benchmark.priceVsSma50Pct ?? -Infinity) > 0).length;
  const breadth200 = verified.filter((benchmark) => (benchmark.priceVsSma200Pct ?? -Infinity) > 0).length;
  const chartBars = Math.min(sessions + 1, ...verified.map((benchmark) => benchmark.bars.length));
  const chartData: TrendPoint[] = [];
  if (verified.length && chartBars > 0) {
    const datedPoints = new Map<string, TrendPoint>();
    for (const benchmark of verified) {
      const bars = benchmark.bars.slice(-chartBars);
      const base = bars[0]?.close;
      if (!base) continue;
      for (const bar of bars) {
        const point = datedPoints.get(bar.date) ?? { date: bar.date };
        point[benchmark.symbol] = bar.close / base * 100;
        datedPoints.set(bar.date, point);
      }
    }
    datedPoints.forEach((point) => chartData.push(point));
    chartData.sort((left, right) => left.date.localeCompare(right.date));
  }

  const positive = (value: number | null) => value != null && value >= 0;

  return (
    <section aria-labelledby="market-overview-heading" className="space-y-5 border-y border-slate-200 py-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Market pulse</p>
          <h2 id="market-overview-heading" className="mt-1 text-xl font-bold text-slate-950">Market trends</h2>
          <p className="mt-1 text-sm text-slate-600">US benchmark ETFs · daily market history · values are not portfolio returns</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {isLoading ? 'Loading market data' : verified.length ? `Data through ${spy?.asOf ?? verified[0].asOf}` : 'No verified market feed'}
          </span>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Refresh market data"
            title="Refresh market data"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="h-72 animate-pulse bg-slate-100" role="status" aria-label="Loading market trends" />
      ) : verified.length === 0 ? (
        <p role="status" className="border-y border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Verified benchmark history is unavailable. Mock prices are not used in this market overview.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 border-y border-slate-200 sm:grid-cols-3 xl:grid-cols-6">
            <div className="border-b border-r border-slate-100 px-4 py-3 xl:border-b-0">
              <p className="text-xs font-medium text-slate-500">S&P 500 trend regime</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{spy?.marketRegime ?? 'Unavailable'}</p>
            </div>
            <div className="border-b border-r border-slate-100 px-4 py-3 sm:border-b-0">
              <p className="text-xs font-medium text-slate-500">Benchmarks above 50-day SMA</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{breadth50} / {verified.length}</p>
            </div>
            <div className="border-b border-r border-slate-100 px-4 py-3 sm:border-b-0 xl:border-r">
              <p className="text-xs font-medium text-slate-500">Benchmarks above 200-day SMA</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{breadth200} / {verified.length}</p>
            </div>
            <div className="border-b border-r border-slate-100 px-4 py-3 sm:border-b-0 sm:border-r-0 xl:border-r">
              <p className="text-xs font-medium text-slate-500">S&P 500 RSI (14)</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{spy?.rsi14?.toFixed(1) ?? 'Unavailable'} <span className="text-xs font-medium text-slate-500">{spy?.rsiState ?? ''}</span></p>
            </div>
            <div className="border-r border-slate-100 px-4 py-3 sm:border-r xl:border-r">
              <p className="text-xs font-medium text-slate-500">S&P 500 volatility · {range}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{spy?.stats.volatilityPct == null ? 'Unavailable' : `${spy.stats.volatilityPct.toFixed(1)}%`}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-slate-500">S&P 500 return · {range}</p>
              <p className={`mt-1 text-lg font-semibold ${spy?.stats.returnPct == null ? 'text-slate-900' : positive(spy.stats.returnPct) ? 'text-emerald-700' : 'text-rose-700'}`}>{formatPct(spy?.stats.returnPct ?? null)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Benchmark chart legend">
              {BENCHMARKS.filter((benchmark) => verified.some((item) => item.symbol === benchmark.symbol)).map((benchmark) => (
                <span key={benchmark.symbol} className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: benchmark.color }} />
                  {benchmark.symbol} · {benchmark.name}
                </span>
              ))}
            </div>
            <div className="inline-flex rounded-md border border-slate-300 p-0.5" role="group" aria-label="Market trend chart range">
              {RANGE_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={range === item}
                  onClick={() => setRange(item)}
                  className={`min-w-11 rounded px-2 py-1.5 text-xs font-semibold ${range === item ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} minTickGap={32} tick={{ fontSize: 11 }} />
                <YAxis width={55} domain={['auto', 'auto']} tickFormatter={(value: number) => value.toFixed(0)} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(value) => `Date: ${value}`} formatter={(value: number, name: string) => [`${value.toFixed(2)} (start = 100)`, name]} />
                {BENCHMARKS.filter((benchmark) => verified.some((item) => item.symbol === benchmark.symbol)).map((benchmark) => (
                  <Line key={benchmark.symbol} type="monotone" dataKey={benchmark.symbol} name={`${benchmark.symbol} · ${benchmark.name}`} stroke={benchmark.color} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {spy?.bars.length ? (
            <section aria-labelledby="sp500-detail-heading" className="border-y border-slate-200 py-4">
              <h3 id="sp500-detail-heading" className="font-semibold text-slate-900">S&P 500 proxy: technical detail</h3>
              <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 text-sm sm:grid-cols-3 xl:grid-cols-6">
                <div>
                  <dt className="text-slate-500">SMA 50</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-slate-900">{formatPrice(spy.sma50)} <span className="text-xs">({formatPct(spy.priceVsSma50Pct)})</span></dd>
                </div>
                <div>
                  <dt className="text-slate-500">SMA 200</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-slate-900">{formatPrice(spy.sma200)} <span className="text-xs">({formatPct(spy.priceVsSma200Pct)})</span></dd>
                </div>
                <div>
                  <dt className="text-slate-500">MACD · signal</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-slate-900">{spy.macdLine?.toFixed(2) ?? 'Unavailable'} · {spy.macdSignal?.toFixed(2) ?? 'Unavailable'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">MACD histogram</dt>
                  <dd className={`mt-1 font-semibold tabular-nums ${spy.macdHistogram == null ? 'text-slate-900' : spy.macdHistogram >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{spy.macdHistogram?.toFixed(2) ?? 'Unavailable'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Bollinger bands · low / mid / high</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-slate-900">{formatPrice(spy.bollingerLower)} / {formatPrice(spy.bollingerMiddle)} / {formatPrice(spy.bollingerUpper)}</dd>
                  <p className="mt-1 text-xs text-slate-500">%B {spy.bollingerPercentB?.toFixed(0) ?? 'N/A'} · width {spy.bollingerWidthPct?.toFixed(1) ?? 'N/A'}%</p>
                </div>
                <div>
                  <dt className="text-slate-500">Trading range · {range}</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-slate-900">{formatPrice(spy.stats.low)} – {formatPrice(spy.stats.high)}</dd>
                  <p className="mt-1 text-xs text-slate-500">{spy.stats.positionPct?.toFixed(1) ?? 'N/A'}% of range</p>
                </div>
                <div>
                  <dt className="text-slate-500">OBV change · {range}</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-slate-900">{formatCompact(spy.stats.obvChange)}</dd>
                  <p className="mt-1 text-xs text-slate-500">Trend: {spy.stats.obvChange == null ? 'Unavailable' : spy.stats.obvChange >= 0 ? 'Rising' : 'Falling'}</p>
                </div>
                <div>
                  <dt className="text-slate-500">Relative strength · {range} vs SPY</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-slate-900">{formatPct(spy.relativePct)}</dd>
                  <p className="mt-1 text-xs text-slate-500">SPY is the comparison baseline</p>
                </div>
              </dl>
            </section>
          ) : null}

          <div className="overflow-x-auto border-y border-slate-200">
            <table className="w-full min-w-[1320px] text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Benchmark</th>
                  <th className="px-3 py-2 text-right font-medium">Latest close</th>
                  <th className="px-3 py-2 text-right font-medium">Return · {range}</th>
                  <th className="px-3 py-2 text-right font-medium">vs SPY · {range}</th>
                  <th className="px-3 py-2 text-right font-medium">Range position · {range}</th>
                  <th className="px-3 py-2 text-right font-medium">Volatility · {range}</th>
                  <th className="px-3 py-2 text-right font-medium">vs SMA 50</th>
                  <th className="px-3 py-2 text-right font-medium">vs SMA 200</th>
                  <th className="px-3 py-2 text-right font-medium">RSI 14</th>
                  <th className="px-3 py-2 text-right font-medium">MACD hist.</th>
                  <th className="px-3 py-2 text-right font-medium">BB %B</th>
                  <th className="px-3 py-2 text-right font-medium">OBV change · {range}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {benchmarks.map((benchmark) => (
                  <tr key={benchmark.symbol}>
                    <th scope="row" className="whitespace-nowrap px-3 py-3 text-left font-semibold text-slate-900">
                      {benchmark.symbol}<span className="ml-2 font-normal text-slate-500">{benchmark.name}</span>
                    </th>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-800">{formatPrice(benchmark.close)}</td>
                    {[benchmark.stats.returnPct, benchmark.relativePct].map((value, index) => (
                      <td key={`${benchmark.symbol}-${index}`} className={`whitespace-nowrap px-3 py-3 text-right tabular-nums ${value == null ? 'text-slate-400' : positive(value) ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatPct(value)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-800">{benchmark.stats.positionPct?.toFixed(0) ?? 'Unavailable'}%</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-800">{benchmark.stats.volatilityPct == null ? 'Unavailable' : `${benchmark.stats.volatilityPct.toFixed(1)}%`}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-800">{formatPct(benchmark.priceVsSma50Pct)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-800">{formatPct(benchmark.priceVsSma200Pct)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-800">{benchmark.rsi14?.toFixed(1) ?? 'Unavailable'} · {benchmark.rsiState ?? 'N/A'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-800">{benchmark.macdHistogram?.toFixed(2) ?? 'Unavailable'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-800">{benchmark.bollingerPercentB?.toFixed(0) ?? 'Unavailable'}%</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-800">{formatCompact(benchmark.stats.obvChange)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            The range selector drives returns, relative strength, volatility, range position, OBV and the chart; SMA, RSI, MACD and Bollinger readings use fixed lookbacks. Market-wide P/E, Shiller CAPE, price-to-book, credit spreads, GDP, employment, interest rates, and inflation are not connected to a data provider yet; no values are inferred. Technical readings use ETF proxies and are not the same as full-market breadth.
          </p>
        </>
      )}
    </section>
  );
}

export { MarketOverview };