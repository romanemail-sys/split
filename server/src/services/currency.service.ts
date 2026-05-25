import { prisma } from '../lib/prisma';

const RATE_STALE_MS = 24 * 60 * 60 * 1000;

interface FrankfurterResponse {
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

  const url = `https://api.frankfurter.app/latest?from=${from}&to=${to}`;

  const res = await fetch(url);

  if (!res.ok) throw new Error('CURRENCY_API_ERROR');

  const data = (await res.json()) as FrankfurterResponse;

  const rate = data.rates[to];
  if (!rate) throw new Error(`UNSUPPORTED_CURRENCY:${to}`);

  await prisma.currencyRate.upsert({
    where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
    update: { rate, fetchedAt: new Date() },
    create: { fromCurrency: from, toCurrency: to, rate },
  });

  return rate;
}
