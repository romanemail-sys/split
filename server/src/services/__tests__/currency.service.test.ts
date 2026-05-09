import { getExchangeRate } from '../currency.service';
import { prisma } from '../../lib/prisma';

function yahooResponse(price: number) {
  return {
    ok: true,
    json: async () => ({
      chart: {
        result: [{ meta: { regularMarketPrice: price } }],
        error: null,
      },
    }),
  };
}

function yahooErrorResponse() {
  return {
    ok: true,
    json: async () => ({
      chart: {
        result: null,
        error: { code: 'Not Found', description: 'No data found' },
      },
    }),
  };
}

const mockFetch = jest.fn().mockImplementation((url: string) => {
  if (url.includes('USDILS')) return Promise.resolve(yahooResponse(3.7));
  if (url.includes('USDEUR')) return Promise.resolve(yahooResponse(0.92));
  return Promise.resolve(yahooErrorResponse());
});

beforeAll(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
});

beforeEach(async () => {
  await prisma.currencyRate.deleteMany({ where: { fromCurrency: 'USD' } });
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

  it('fetches from Yahoo Finance and stores in DB on cache miss', async () => {
    const rate = await getExchangeRate('USD', 'ILS');
    expect(rate).toBe(3.7);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('USDILS=X');

    const cached = await prisma.currencyRate.findUnique({
      where: { fromCurrency_toCurrency: { fromCurrency: 'USD', toCurrency: 'ILS' } },
    });
    expect(cached).not.toBeNull();
    expect(Number(cached!.rate)).toBe(3.7);
  });

  it('returns cached rate without calling API on cache hit', async () => {
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
    await expect(getExchangeRate('USD', 'XYZ')).rejects.toThrow('UNSUPPORTED_CURRENCY:XYZ');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('USDXYZ=X');
  });
});
