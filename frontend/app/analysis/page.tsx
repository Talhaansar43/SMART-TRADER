'use client';

import { FormEvent, useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
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

interface ProfitabilityHistoryPoint {
  period: string;
  asOf: string;
  grossProfitMargin: number | null;
  operatingProfitMargin: number | null;
  netProfitMargin: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  returnOnCapitalEmployed: number | null;
}

interface CompanyNewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  provider: string;
  category: 'news' | 'filing';
  url: string | null;
  datetime: number;
  tone: 'POSITIVE' | 'NEGATIVE' | 'MIXED' | 'NEUTRAL';
  toneSignals: string[];
}

interface NewsProviderStatus {
  id: string;
  name: string;
  status: 'connected' | 'setup_required' | 'license_required' | 'unavailable';
  articleCount: number;
}

interface CompanyNewsResponse {
  symbol: string;
  items: CompanyNewsItem[];
  providers: NewsProviderStatus[];
  source: 'aggregated' | 'unavailable';
  cached: boolean;
}

type FinancialKpiKey =
  | 'grossProfitMargin'
  | 'operatingProfitMargin'
  | 'netProfitMargin'
  | 'returnOnEquity'
  | 'returnOnAssets'
  | 'returnOnCapitalEmployed'
  | 'priceToEarnings'
  | 'earningsPerShare'
  | 'priceToSales'
  | 'priceToBook'
  | 'ebitda'
  | 'enterpriseValueToEbitda'
  | 'debtToEquity'
  | 'currentRatio'
  | 'quickRatio'
  | 'netDebt'
  | 'freeCashFlow'
  | 'operatingCashFlow'
  | 'revenueGrowthRate'
  | 'inventoryTurnover'
  | 'assetTurnover'
  | 'beta'
  | 'dividendYield'
  | 'revenue'
  | 'grossProfit'
  | 'operatingIncome'
  | 'netIncome';

interface QuarterlyFinancialHistoryPoint {
  fiscalYear: number;
  quarter: number;
  period: string;
  asOf: string;
  kpis: Record<FinancialKpiKey, number | null>;
}

interface ProfitChartPoint {
  fiscalYear: number;
  quarter: number;
  period: string;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
}

interface ProfitChangeDotProps {
  cx?: number;
  cy?: number;
  payload?: ProfitChartPoint;
  profitKey: keyof Pick<ProfitChartPoint, 'grossProfit' | 'operatingIncome' | 'netIncome'>;
  history: ProfitChartPoint[];
}

interface StockAnalysis {
  symbol: string;
  status: 'EVALUATED' | 'NOT_EVALUATED';
  reason: string | null;
  source: string | null;
  mock: boolean | null;
  historyError: string | null;
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
  financialKpis: Record<FinancialKpiKey, number | null> | null;
  quarterlyFinancialHistory: QuarterlyFinancialHistoryPoint[];
  financialKpiPeriods: {
    balanceSheet: string | null;
    annualStatements: string | null;
    ratioMetrics: string | null;
  } | null;
  profitabilityHistory: ProfitabilityHistoryPoint[];
  quote: {
    currentPrice?: number;
    previousClose?: number;
    dataTimestamp?: string | null;
    source?: string;
    mock?: boolean;
  } | null;
}

const QUICK_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL'];
const FINANCIAL_KPI_GROUPS: {
  title: string;
  metrics: { key: FinancialKpiKey; label: string; format: 'percent' | 'multiple' | 'currency' | 'perShare' | 'number' }[];
}[] = [
  {
    title: 'Profitability & Margins',
    metrics: [
      { key: 'revenue', label: 'Revenue', format: 'currency' },
      { key: 'grossProfit', label: 'Gross profit', format: 'currency' },
      { key: 'operatingIncome', label: 'Operating income', format: 'currency' },
      { key: 'netIncome', label: 'Net income', format: 'currency' },
      { key: 'earningsPerShare', label: 'Diluted EPS', format: 'perShare' },
    ],
  },
  {
    title: 'Returns',
    metrics: [
      { key: 'returnOnEquity', label: 'Return on equity (ROE)', format: 'percent' },
      { key: 'returnOnAssets', label: 'Return on assets (ROA)', format: 'percent' },
      { key: 'returnOnCapitalEmployed', label: 'Return on capital employed (ROCE)', format: 'percent' },
    ],
  },
  {
    title: 'Valuation',
    metrics: [
      { key: 'ebitda', label: 'Quarterly EBITDA', format: 'currency' },
    ],
  },
  {
    title: 'Financial Health & Solvency',
    metrics: [
      { key: 'debtToEquity', label: 'Debt-to-equity (D/E)', format: 'multiple' },
      { key: 'currentRatio', label: 'Current ratio', format: 'multiple' },
      { key: 'quickRatio', label: 'Quick ratio', format: 'multiple' },
      { key: 'netDebt', label: 'Net debt', format: 'currency' },
    ],
  },
  {
    title: 'Cash Flow',
    metrics: [
      { key: 'freeCashFlow', label: 'Free cash flow', format: 'currency' },
      { key: 'operatingCashFlow', label: 'Operating cash flow', format: 'currency' },
    ],
  },
  {
    title: 'Growth & Efficiency',
    metrics: [
      { key: 'revenueGrowthRate', label: 'Revenue growth (YoY)', format: 'percent' },
      { key: 'inventoryTurnover', label: 'Inventory turnover', format: 'multiple' },
      { key: 'assetTurnover', label: 'Asset turnover', format: 'multiple' },
    ],
  },
];

const CURRENT_MARKET_KPI_METRICS: {
  key: FinancialKpiKey;
  label: string;
  format: 'percent' | 'multiple' | 'currency' | 'perShare' | 'number';
}[] = [
  { key: 'priceToEarnings', label: 'Price-to-earnings (P/E)', format: 'multiple' },
  { key: 'priceToSales', label: 'Price-to-sales (P/S)', format: 'multiple' },
  { key: 'priceToBook', label: 'Price-to-book (P/B)', format: 'multiple' },
  { key: 'enterpriseValueToEbitda', label: 'EV / EBITDA', format: 'multiple' },
  { key: 'beta', label: 'Beta', format: 'number' },
  { key: 'dividendYield', label: 'Dividend yield', format: 'percent' },
];

function formatNumber(value: number | null | undefined, digits = 2) {
  return value == null || !Number.isFinite(value)
    ? 'Unavailable'
    : value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatPercent(value: number | null | undefined) {
  return value == null ? 'Unavailable' : `${value > 0 ? '+' : ''}${formatNumber(value)}%`;
}

function getNewsPriceReaction(item: CompanyNewsItem, history: PriceHistoryPoint[]) {
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(item.datetime * 1000));
  const part = (type: string) => dateParts.find((datePart) => datePart.type === type)?.value ?? '';
  const publishedDate = `${part('year')}-${part('month')}-${part('day')}`;
  const publishedAfterClose = Number(part('hour')) >= 16;
  const closeIndex = history.findIndex((point) => (
    point.date > publishedDate || (!publishedAfterClose && point.date === publishedDate)
  ));

  if (closeIndex < 1) return null;
  const previousClose = history[closeIndex - 1].close;
  const nextClose = history[closeIndex].close;
  if (previousClose <= 0 || !Number.isFinite(nextClose)) return null;

  return {
    date: history[closeIndex].date,
    changePct: (nextClose / previousClose - 1) * 100,
  };
}

function formatKpi(value: number | null | undefined, format: 'percent' | 'multiple' | 'currency' | 'perShare' | 'number') {
  if (value == null || !Number.isFinite(value)) return 'Unavailable';
  if (format === 'percent') return `${formatNumber(value)}%`;
  if (format === 'multiple') return `${formatNumber(value)}x`;
  if (format === 'currency') {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
  }
  if (format === 'perShare') return `$${formatNumber(value)}`;
  return formatNumber(value);
}

function formatQuarterChange(
  current: number | null | undefined,
  previous: number | null | undefined,
  format: 'percent' | 'multiple' | 'currency' | 'perShare' | 'number',
) {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) {
    return { label: 'No prior quarter', className: 'text-slate-500' };
  }
  const delta = current - previous;
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  return {
    label: `${sign}${formatKpi(Math.abs(delta), format)} QoQ`,
    className: delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-rose-700' : 'text-slate-500',
  };
}

function getQuarterSignalColor(current: number | null, previous: number | null) {
  if (current == null || previous == null) return '#d97706';
  if (current > previous) return '#16803d';
  if (current < previous) return '#be123c';
  return '#d97706';
}

function ProfitChangeDot({ cx, cy, payload, profitKey, history }: ProfitChangeDotProps) {
  if (cx == null || cy == null || !payload) return <g />;
  const historyIndex = history.findIndex((point) => point.period === payload.period);
  const previousValue = historyIndex > 0 ? history[historyIndex - 1][profitKey] : null;
  const currentValue = payload[profitKey];

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={getQuarterSignalColor(currentValue, previousValue)}
      stroke="#ffffff"
      strokeWidth={2}
    />
  );
}

export default function AnalysisPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [profitabilityRange, setProfitabilityRange] = useState<'4Q' | '8Q' | '12Q' | 'ALL'>('12Q');
  const [kpiRange, setKpiRange] = useState<'4Q' | '8Q' | '12Q' | 'ALL'>('8Q');
  const [selectedKpiGroup, setSelectedKpiGroup] = useState(FINANCIAL_KPI_GROUPS[0].title);
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [companyNews, setCompanyNews] = useState<CompanyNewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoadingNews, setIsLoadingNews] = useState(false);

  async function handleEvaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsEvaluating(true);
    setIsLoadingNews(true);
    setError(null);
    setNewsError(null);
    setAnalysis(null);
    setCompanyNews(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const normalizedSymbol = symbol.trim().toUpperCase();
    const analysisRequest = (async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/analysis/stocks/analyze?symbol=${encodeURIComponent(normalizedSymbol)}`
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
    })();
    const newsRequest = (async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/analysis/stocks/news?symbol=${encodeURIComponent(normalizedSymbol)}&limit=10`
        );
        if (!response.ok) throw new Error(`News request failed (${response.status})`);
        setCompanyNews(await response.json());
      } catch (requestError) {
        setNewsError(requestError instanceof Error ? requestError.message : 'Company news is unavailable');
      } finally {
        setIsLoadingNews(false);
      }
    })();
    await Promise.all([analysisRequest, newsRequest]);
  }

  const verified = analysis?.status === 'EVALUATED' && analysis.mock === false;
  const quoteAvailable = analysis?.quote?.source === 'finnhub' && analysis.quote.mock === false;
  const companyName = typeof analysis?.company?.name === 'string' ? analysis.company.name : analysis?.symbol;
  const quarterlyFinancialHistory = analysis?.quarterlyFinancialHistory ?? [];
  const visibleQuarterlyHistory = (kpiRange === 'ALL'
    ? quarterlyFinancialHistory
    : quarterlyFinancialHistory.slice(-Number(kpiRange.slice(0, -1))))
    .slice()
    .reverse();
  const profitChartHistory: ProfitChartPoint[] = quarterlyFinancialHistory.map((period) => ({
    fiscalYear: period.fiscalYear,
    quarter: period.quarter,
    period: period.period,
    grossProfit: period.kpis.grossProfit,
    operatingIncome: period.kpis.operatingIncome,
    netIncome: period.kpis.netIncome,
  }));
  const visibleQuarterlyTrendHistory = profitabilityRange === 'ALL'
    ? profitChartHistory
    : profitChartHistory.slice(-Number(profitabilityRange.slice(0, -1)));
  const profitabilityHistory: ProfitabilityHistoryPoint[] = quarterlyFinancialHistory.map((period) => ({
    period: period.period,
    asOf: period.asOf,
    grossProfitMargin: period.kpis.grossProfitMargin,
    operatingProfitMargin: period.kpis.operatingProfitMargin,
    netProfitMargin: period.kpis.netProfitMargin,
    returnOnEquity: period.kpis.returnOnEquity,
    returnOnAssets: period.kpis.returnOnAssets,
    returnOnCapitalEmployed: period.kpis.returnOnCapitalEmployed,
  }));
  const visibleProfitabilityHistory = profitabilityRange === 'ALL'
    ? profitabilityHistory
    : profitabilityHistory.slice(-Number(profitabilityRange.slice(0, -1)));
  const latestQuarter = quarterlyFinancialHistory[quarterlyFinancialHistory.length - 1];
  const previousQuarter = quarterlyFinancialHistory[quarterlyFinancialHistory.length - 2];
  const activeKpiGroup = FINANCIAL_KPI_GROUPS.find((group) => group.title === selectedKpiGroup)
    ?? FINANCIAL_KPI_GROUPS[0];

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
                {verified ? `${analysis.source?.toUpperCase()} · VERIFIED HISTORY` : quoteAvailable ? `FINNHUB QUOTE · ${analysis.source === 'unavailable' ? 'HISTORY UNAVAILABLE' : 'HISTORY NOT VERIFIED'}` : 'VERIFIED DATA UNAVAILABLE'}
              </span>
              <p className="mt-2 text-xs text-slate-500">{analysis.barsUsed} daily candles · Through {analysis.asOf ?? 'unavailable'}</p>
            </div>
          </section>

          {!verified && (
            <p role="status" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {analysis.historyError
                ? `Unable to retrieve real historical candles: ${analysis.historyError}`
                : `${analysis.reason?.replaceAll('_', ' ').toLowerCase() ?? 'The provider did not return verifiable historical data.'}.`}{' '}
              Technical analysis is withheld unless the feed provides real, chronologically valid candles.
            </p>
          )}

          {verified && analysis.trend && analysis.momentum && (
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

            </>
          )}

          <section aria-labelledby="company-news-heading" className="border-y border-slate-200 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 id="company-news-heading" className="font-semibold text-slate-900">Latest company news</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Tone is a text-based cue. The next-close move is observed context; other events may also affect price.
                </p>
              </div>
              {companyNews?.items.length > 0 && (
                <span className="text-xs text-slate-500">{companyNews.items.length} most recent stories · Past 30 days</span>
              )}
            </div>

            {companyNews?.providers && (
              <div className="mt-4 flex flex-wrap gap-2" aria-label="News provider status">
                {companyNews.providers.map((provider) => {
                  const statusLabel = {
                    connected: provider.articleCount > 0 ? `${provider.articleCount} stories` : 'Connected',
                    setup_required: provider.id === 'sec_edgar' ? 'Contact email needed' : 'API key needed',
                    license_required: 'License required',
                    unavailable: 'Temporarily unavailable',
                  }[provider.status];
                  const statusStyle = {
                    connected: 'border-emerald-200 bg-emerald-50 text-emerald-800',
                    setup_required: 'border-slate-200 bg-slate-50 text-slate-600',
                    license_required: 'border-amber-200 bg-amber-50 text-amber-900',
                    unavailable: 'border-rose-200 bg-rose-50 text-rose-800',
                  }[provider.status];

                  return (
                    <span key={provider.id} className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] ${statusStyle}`}>
                      <span className="font-semibold">{provider.name}</span>
                      <span>{statusLabel}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {isLoadingNews && <p role="status" className="py-6 text-sm text-slate-500">Loading company news...</p>}
            {newsError && <p role="status" className="py-5 text-sm text-amber-800">News could not be loaded: {newsError}</p>}
            {!isLoadingNews && !newsError && companyNews?.source === 'unavailable' && (
              <p role="status" className="py-5 text-sm text-slate-600">No company stories were returned by the connected providers.</p>
            )}
            {!isLoadingNews && !newsError && companyNews?.source === 'aggregated' && companyNews.items.length === 0 && (
              <p className="py-5 text-sm text-slate-600">No company news found in the past 30 days.</p>
            )}
            {companyNews?.source === 'aggregated' && companyNews.items.length > 0 && (
              <ol className="mt-4 columns-1 gap-3 md:columns-2 xl:columns-3">
                {companyNews.items.map((item) => {
                  const priceReaction = verified ? getNewsPriceReaction(item, analysis.priceHistory) : null;
                  const toneStyle = {
                    POSITIVE: 'bg-emerald-100 text-emerald-900',
                    NEGATIVE: 'bg-rose-100 text-rose-900',
                    MIXED: 'bg-amber-100 text-amber-900',
                    NEUTRAL: 'bg-slate-100 text-slate-700',
                  }[item.tone];
                  const toneLabel = {
                    POSITIVE: 'Positive tone',
                    NEGATIVE: 'Negative tone',
                    MIXED: 'Mixed tone',
                    NEUTRAL: 'Neutral tone',
                  }[item.tone];

                  return (
                    <li key={item.id} className="mb-3 break-inside-avoid">
                      <details className="group overflow-hidden rounded-md border border-slate-200 bg-white transition-colors open:border-slate-300">
                        <summary className="flex cursor-pointer list-none items-start gap-3 p-3.5 marker:hidden hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 [&::-webkit-details-marker]:hidden sm:items-center sm:px-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                              {item.category === 'filing' && (
                                <span className="inline-flex rounded bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-900">SEC filing</span>
                              )}
                              <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${toneStyle}`}>
                                {toneLabel}
                              </span>
                              <span className="text-xs text-slate-500">
                                {item.source}{item.provider !== item.source ? ` via ${item.provider}` : ''} · {new Date(item.datetime * 1000).toLocaleString()}
                              </span>
                            </div>
                            <h4 className="mt-2 text-sm font-semibold leading-snug text-slate-900 sm:text-[15px]">
                              {item.headline}
                            </h4>
                            {item.summary && (
                              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{item.summary}</p>
                            )}
                            <p className={`mt-2 text-xs font-medium tabular-nums ${priceReaction ? priceReaction.changePct >= 0 ? 'text-emerald-700' : 'text-rose-700' : 'text-slate-500'}`}>
                              {priceReaction
                                ? `Next close ${priceReaction.date} · ${formatPercent(priceReaction.changePct)} vs prior close`
                                : 'Next-close move unavailable'}
                            </p>
                          </div>
                          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180 sm:mt-0" aria-hidden="true" />
                        </summary>

                        <div className="space-y-4 border-t border-slate-200 bg-slate-50/70 px-4 py-4">
                          {item.summary && (
                            <p className="max-w-4xl text-sm leading-relaxed text-slate-700">{item.summary}</p>
                          )}
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase text-slate-500">Headline tone</p>
                              <p className="mt-1 text-sm font-medium text-slate-800">{toneLabel}</p>
                              {item.toneSignals.length > 0 && (
                                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                  Matched terms: {item.toneSignals.join(', ')}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase text-slate-500">Observed price context</p>
                              <p className="mt-1 text-sm font-medium text-slate-800">
                                {priceReaction
                                  ? `${formatPercent(priceReaction.changePct)} close-to-close on ${priceReaction.date}`
                                  : 'A verified next-close move is not available.'}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                This movement is not necessarily caused by this story.
                              </p>
                            </div>
                          </div>
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950">
                              Read at {item.source}
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {verified && analysis.risk && (
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
          )}

          {(analysis.company || analysis.financialKpis) && (
            <section className="border-y border-slate-200 py-5">
              <h3 className="font-semibold text-slate-900">Quarterly company performance</h3>
              {analysis.company?.finnhubIndustry && <p className="mt-1 text-sm text-slate-600">{String(analysis.company.finnhubIndustry)}{analysis.company.country ? ` · ${String(analysis.company.country)}` : ''}</p>}
              <p className="mt-2 max-w-4xl text-xs leading-relaxed text-slate-500">
                Profitability table values are reported amounts in USD. Flow values are standalone fiscal quarters; Q4 is derived from annual filings when available. Returns are not annualized, and balance-sheet ratios use quarter-end values. A dash means the provider did not report enough data for that quarter.
              </p>
              {quarterlyFinancialHistory.length > 0 ? (
                <>
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    {FINANCIAL_KPI_GROUPS[0].metrics.map((metric) => {
                      const currentValue = latestQuarter?.kpis[metric.key];
                      const previousValue = previousQuarter?.kpis[metric.key];
                      const change = formatQuarterChange(currentValue, previousValue, metric.format);

                      return (
                        <article key={metric.key} className="rounded-md border border-slate-200 bg-white p-3.5">
                          <h4 className="text-xs font-medium text-slate-500">{metric.label}</h4>
                          <p className="mt-2 text-lg font-semibold tabular-nums text-slate-950">
                            {formatKpi(currentValue, metric.format)}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">{latestQuarter?.period ?? 'Latest quarter'}</p>
                          <p className={`mt-2 text-xs font-semibold tabular-nums ${change.className}`}>{change.label}</p>
                        </article>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 border-y border-slate-200 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-1 overflow-x-auto pb-1" role="group" aria-label="KPI category">
                      {FINANCIAL_KPI_GROUPS.map((group) => (
                        <button
                          key={group.title}
                          type="button"
                          aria-pressed={selectedKpiGroup === group.title}
                          onClick={() => setSelectedKpiGroup(group.title)}
                          className={`shrink-0 rounded px-3 py-2 text-xs font-semibold transition-colors ${selectedKpiGroup === group.title ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                          {group.title}
                        </button>
                      ))}
                    </div>
                    <div className="inline-flex self-start rounded-md border border-slate-300 p-0.5" role="group" aria-label="KPI quarter range">
                      {(['4Q', '8Q', '12Q', 'ALL'] as const).map((range) => (
                        <button
                          key={range}
                          type="button"
                          aria-pressed={kpiRange === range}
                          onClick={() => setKpiRange(range)}
                          className={`min-w-12 rounded px-2.5 py-1.5 text-xs font-semibold transition-colors ${kpiRange === range ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                          {range === 'ALL' ? 'All' : range}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div id="quarterly-kpi-panel" role="region" aria-label={`${activeKpiGroup.title} by quarter`} className="mt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-4 w-1 rounded-full bg-emerald-700" aria-hidden="true" />
                      <h4 className="text-sm font-semibold text-slate-900">{activeKpiGroup.title}</h4>
                    </div>
                    <div className="overflow-x-auto overscroll-x-contain rounded-md border border-slate-200 bg-white">
                      <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th scope="col" className="sticky left-0 z-20 min-w-48 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">Metric</th>
                            {visibleQuarterlyHistory.map((period) => (
                              <th key={period.period} scope="col" className={`min-w-28 border-b border-slate-200 px-3 py-2.5 text-right ${period.quarter === 1 ? 'border-l-2 border-l-slate-300' : 'border-l border-l-slate-200'}`}>
                                <span className="block font-semibold text-slate-900">Q{period.quarter}</span>
                                <span className="mt-0.5 block text-[11px] font-medium text-slate-500">FY {period.fiscalYear}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {activeKpiGroup.metrics.map((metric, metricIndex) => (
                            <tr key={metric.key} className={`group ${metricIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} hover:bg-emerald-50/60`}>
                              <th scope="row" className={`sticky left-0 z-10 border-t border-slate-100 px-3 py-2.5 text-left text-xs font-medium text-slate-700 group-hover:bg-emerald-50 ${metricIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>{metric.label}</th>
                              {visibleQuarterlyHistory.map((period) => {
                                const value = period.kpis[metric.key];
                                return (
                                  <td key={period.period} className={`border-l border-t border-slate-100 px-3 py-2.5 text-right font-medium tabular-nums text-slate-900 ${period.quarter === 1 ? 'border-l-2 border-l-slate-300' : ''}`}>
                                    {value == null ? <span className="text-slate-400">—</span> : formatKpi(value, metric.format)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : <p className="mt-3 text-sm text-slate-600">Quarterly statement history is not available from the current provider.</p>}

              {analysis.financialKpis && (
                <section className="mt-5 border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-800">Latest market snapshot</h4>
                  <p className="mt-1 text-xs text-slate-500">These market-based metrics reflect the latest provider data, not historical quarters.</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
                    {CURRENT_MARKET_KPI_METRICS.map((metric) => (
                      <div key={metric.key}>
                        <dt className="text-slate-500">{metric.label}</dt>
                        <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                          {formatKpi(analysis.financialKpis?.[metric.key], metric.format)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </section>
          )}

          {quarterlyFinancialHistory.length > 0 && (
            <section className="border-y border-slate-200 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Quarterly profitability and returns</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Profit trends use actual USD amounts. Return ratios remain percentages and are not annualized.
                  </p>
                </div>
                <div className="inline-flex self-start rounded-md border border-slate-300 p-0.5" role="group" aria-label="Profitability chart range">
                  {(['4Q', '8Q', '12Q', 'ALL'] as const).map((range) => (
                    <button
                      key={range}
                      type="button"
                      aria-pressed={profitabilityRange === range}
                      onClick={() => setProfitabilityRange(range)}
                      className={`min-w-12 rounded px-2.5 py-1.5 text-xs font-semibold transition-colors ${profitabilityRange === range ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {range === 'ALL' ? 'All' : range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-6 xl:grid-cols-2">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-sm font-medium text-slate-800">Profit amounts (USD)</h4>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600" aria-label="Profit chart legend">
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-emerald-700" aria-hidden="true" />Gross profit</span>
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-sky-700" aria-hidden="true" />Operating income</span>
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-amber-600" aria-hidden="true" />Net income</span>
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-700" aria-hidden="true" />Up</span>
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-700" aria-hidden="true" />Down</span>
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-600" aria-hidden="true" />Flat / unavailable</span>
                    </div>
                  </div>
                  <div className="h-[270px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={visibleQuarterlyTrendHistory} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis width={76} tickFormatter={(value: number) => formatKpi(value, 'currency')} tick={{ fontSize: 11 }} />
                        <Tooltip labelFormatter={(value) => `${value}`} formatter={(value: number, name: string) => [formatKpi(value, 'currency'), name]} />
                        <Line type="monotone" dataKey="grossProfit" name="Gross profit" stroke="#047857" strokeWidth={2} dot={<ProfitChangeDot profitKey="grossProfit" history={profitChartHistory} />} connectNulls={false} />
                        <Line type="monotone" dataKey="operatingIncome" name="Operating income" stroke="#0369a1" strokeWidth={2} dot={<ProfitChangeDot profitKey="operatingIncome" history={profitChartHistory} />} connectNulls={false} />
                        <Line type="monotone" dataKey="netIncome" name="Net income" stroke="#d97706" strokeWidth={2} dot={<ProfitChangeDot profitKey="netIncome" history={profitChartHistory} />} connectNulls={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="mb-2 text-sm font-medium text-slate-800">Returns</h4>
                  <div className="h-[270px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={visibleProfitabilityHistory} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis width={48} tickFormatter={(value: number) => `${value}%`} tick={{ fontSize: 11 }} />
                        <Tooltip labelFormatter={(value) => `${value}`} formatter={(value: number, name: string) => [`${formatNumber(value)}%`, name]} />
                        <Line type="monotone" dataKey="returnOnEquity" name="ROE" stroke="#be123c" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
                        <Line type="monotone" dataKey="returnOnAssets" name="ROA" stroke="#7c3aed" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
                        <Line type="monotone" dataKey="returnOnCapitalEmployed" name="ROCE" stroke="#475569" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>
          )}

          <footer className="flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:justify-between">
            <span>Source: {analysis.source ?? 'Unavailable'} · {analysis.barsUsed} real candles · As of {analysis.asOf ?? 'unavailable'}</span>
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