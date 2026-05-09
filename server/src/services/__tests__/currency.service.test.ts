import { getExchangeRate } from '../currency.service';
import { prisma } from '../../lib/prisma';

const mockRates = { USD: 1, EUR: 0.92, ILS: 3.7 };

const mockFetch = jest.fn().mockResolvedValue({
  json: async () => ({ result: 'success', rates: mockRates }),
});

beforeAll(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
});

beforeEach(async () => {
  await prisma.currencyRate.deleteMany({
    where: { fromCurrency: 'USD' },
  });
  mockFetch.mockClear();
});

afterAll(async () => {
  await prisma.currencyRate.deleteMany({ where: { fromCurrency: 'USD' } });
  await prisma.$disconnect();
});

describe('getExchangeRate', () => {
  it('returns 1 for same currency', async () => {
    const rate = await getExchangeRate('USD', 'USD');
    expect(rate).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches from API and stores in DB on cache miss', async () => {
    const rate = await getExchangeRate('USD', 'ILS');
    expect(rate).toBe(3.7);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const cached = await prisma.currencyRate.findUnique({
      where: { fromCurrency_toCurrency: { fromCurrency: 'USD', toCurrency: 'ILS' } },
    });
    expect(cached).not.toBeNull();
    expect(Number(cached!.rate)).toBe(3.7);
  });

  it('returns cached rate without calling API on cache hit', async () => {
    // Seed cache directly so fetchedAt is fresh
    await prisma.currencyRate.upsert({
      where: { fromCurrency_toCurrency: { fromCurrency: 'USD', toCurrency: 'EUR' } },
      update: { rate: 0.92, fetchedAt: new Date() },
      create: { fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.92 },
    });

    const rate = await getExchangeRate('USD', 'EUR');
    expect(rate).toBe(0.92);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws UNSUPPORTED_CURRENCY for unknown target', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ result: 'success', rates: { EUR: 0.92 } }),
    });
    await expect(getExchangeRate('USD', 'XYZ')).rejects.toThrow('UNSUPPORTED_CURRENCY:XYZ');
  });
});
