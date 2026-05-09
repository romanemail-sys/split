import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface RateResult {
  from: string;
  to: string;
  rate: number;
}

export function useCurrencyRate(from: string, to: string) {
  return useQuery<RateResult>({
    queryKey: ['currency-rate', from, to],
    queryFn: async () => {
      const { data } = await api.get('/currency/rate', { params: { from, to } });
      return data;
    },
    enabled: !!from && !!to && from !== to,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
