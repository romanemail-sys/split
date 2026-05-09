import { prisma } from '../lib/prisma';

const RATE_STALE_MS = 24 * 60 * 60 * 1000;

interface ERApiResponse {
  result: string;
  rates: Record<string, number>;
}

export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const cached = await prisma.currencyRate.findUnique({
    where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
  });

  if (cached && Date.now() - cached.fetchedAt.getTime() < RATE_STALE_MS) {
    return Number(cached.rate);
  }

  const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
  const data = (await res.json()) as ERApiResponse;

  if (data.result !== 'success') throw new Error('CURRENCY_API_ERROR');

  const rate = data.rates[to];
  if (!rate) throw new Error(`UNSUPPORTED_CURRENCY:${to}`);

  await prisma.currencyRate.upsert({
    where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
    update: { rate, fetchedAt: new Date() },
    create: { fromCurrency: from, toCurrency: to, rate },
  });

  return rate;
}
