import { prisma } from '../lib/prisma';

const RATE_STALE_MS = 24 * 60 * 60 * 1000;

interface YahooChartResponse {
  chart: {
    result: Array<{ meta: { regularMarketPrice: number } }> | null;
    error: { code: string; description: string } | null;
  };
}

export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const cached = await prisma.currencyRate.findUnique({
    where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
  });

  if (cached && Date.now() - cached.fetchedAt.getTime() < RATE_STALE_MS) {
    return Number(cached.rate);
  }

  const symbol = `${from}${to}=X`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) throw new Error('CURRENCY_API_ERROR');

  const data = (await res.json()) as YahooChartResponse;

  if (data.chart.error || !data.chart.result?.[0]) {
    throw new Error(`UNSUPPORTED_CURRENCY:${to}`);
  }

  const rate = data.chart.result[0].meta.regularMarketPrice;
  if (!rate) throw new Error(`UNSUPPORTED_CURRENCY:${to}`);

  await prisma.currencyRate.upsert({
    where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
    update: { rate, fetchedAt: new Date() },
    create: { fromCurrency: from, toCurrency: to, rate },
  });

  return rate;
}
