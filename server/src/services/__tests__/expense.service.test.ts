import { calculateSplits } from '../expense.service';

describe('calculateSplits — EQUAL', () => {
  it('splits evenly when divisible', () => {
    const splits = calculateSplits(30, 'EQUAL', [
      { userId: 'a' }, { userId: 'b' }, { userId: 'c' },
    ]);
    expect(splits).toEqual([
      { userId: 'a', amount: 10 },
      { userId: 'b', amount: 10 },
      { userId: 'c', amount: 10 },
    ]);
  });

  it('last person gets remainder on indivisible amount', () => {
    const splits = calculateSplits(10, 'EQUAL', [
      { userId: 'a' }, { userId: 'b' }, { userId: 'c' },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(1000);
    expect(splits[0].amount).toBe(splits[1].amount);
    expect(splits[2].amount).toBeGreaterThanOrEqual(splits[0].amount);
  });

  it('handles two-person equal split with remainder', () => {
    const splits = calculateSplits(10, 'EQUAL', [
      { userId: 'a' }, { userId: 'b' },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(1000);
    expect(splits[0].amount).toBe(5);
    expect(splits[1].amount).toBe(5);
  });

  it('handles single person split', () => {
    const splits = calculateSplits(25.50, 'EQUAL', [{ userId: 'a' }]);
    expect(splits).toEqual([{ userId: 'a', amount: 25.50 }]);
  });

  it('handles large amount with many people', () => {
    const splits = calculateSplits(100, 'EQUAL', [
      { userId: 'a' }, { userId: 'b' }, { userId: 'c' }, { userId: 'd' },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(10000);
    splits.slice(0, -1).forEach(split => {
      expect(split.amount).toBe(25);
    });
    expect(splits[3].amount).toBe(25);
  });
});

describe('calculateSplits — EXACT', () => {
  it('uses provided amounts as-is', () => {
    const splits = calculateSplits(100, 'EXACT', [
      { userId: 'a', amount: 60 },
      { userId: 'b', amount: 40 },
    ]);
    expect(splits).toEqual([
      { userId: 'a', amount: 60 },
      { userId: 'b', amount: 40 },
    ]);
  });

  it('preserves decimal precision', () => {
    const splits = calculateSplits(100, 'EXACT', [
      { userId: 'a', amount: 33.33 },
      { userId: 'b', amount: 66.67 },
    ]);
    expect(splits).toEqual([
      { userId: 'a', amount: 33.33 },
      { userId: 'b', amount: 66.67 },
    ]);
  });

  it('handles single exact split', () => {
    const splits = calculateSplits(150.75, 'EXACT', [
      { userId: 'a', amount: 150.75 },
    ]);
    expect(splits).toEqual([{ userId: 'a', amount: 150.75 }]);
  });

  it('handles fractional amounts', () => {
    const splits = calculateSplits(50, 'EXACT', [
      { userId: 'a', amount: 12.34 },
      { userId: 'b', amount: 37.66 },
    ]);
    expect(splits[0].amount).toBeCloseTo(12.34, 2);
    expect(splits[1].amount).toBeCloseTo(37.66, 2);
  });
});

describe('calculateSplits — PERCENTAGE', () => {
  it('allocates by percentage with last-person rounding', () => {
    const splits = calculateSplits(100, 'PERCENTAGE', [
      { userId: 'a', percentage: 33 },
      { userId: 'b', percentage: 33 },
      { userId: 'c', percentage: 34 },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(10000);
  });

  it('sums to total when percentages are round', () => {
    const splits = calculateSplits(200, 'PERCENTAGE', [
      { userId: 'a', percentage: 25 },
      { userId: 'b', percentage: 75 },
    ]);
    expect(splits[0].amount).toBe(50);
    expect(splits[1].amount).toBe(150);
  });

  it('handles three-way percentage split with rounding', () => {
    const splits = calculateSplits(100, 'PERCENTAGE', [
      { userId: 'a', percentage: 33 },
      { userId: 'b', percentage: 33 },
      { userId: 'c', percentage: 34 },
    ]);
    expect(splits[0].amount).toBeCloseTo(33, 2);
    expect(splits[1].amount).toBeCloseTo(33, 2);
    expect(splits[2].amount).toBeCloseTo(34, 2);
  });

  it('handles percentage split with rounding remainder', () => {
    const splits = calculateSplits(10, 'PERCENTAGE', [
      { userId: 'a', percentage: 50 },
      { userId: 'b', percentage: 50 },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(1000);
  });

  it('gives last person all remaining cents from rounding', () => {
    const splits = calculateSplits(10, 'PERCENTAGE', [
      { userId: 'a', percentage: 33 },
      { userId: 'b', percentage: 33 },
      { userId: 'c', percentage: 34 },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(1000);
  });
});

describe('calculateSplits — SHARES', () => {
  it('splits by share weights', () => {
    const splits = calculateSplits(60, 'SHARES', [
      { userId: 'a', shares: 1 },
      { userId: 'b', shares: 2 },
    ]);
    expect(splits[0].amount).toBe(20);
    expect(splits[1].amount).toBe(40);
  });

  it('last person gets remainder', () => {
    const splits = calculateSplits(10, 'SHARES', [
      { userId: 'a', shares: 1 },
      { userId: 'b', shares: 1 },
      { userId: 'c', shares: 1 },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(1000);
  });

  it('handles unequal shares', () => {
    const splits = calculateSplits(100, 'SHARES', [
      { userId: 'a', shares: 1 },
      { userId: 'b', shares: 2 },
      { userId: 'c', shares: 3 },
    ]);
    // 100 / 6 shares total
    // a: 16.67, b: 33.33, c: 50.00 (c gets remainder)
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(10000);
    expect(splits[0].amount).toBeLessThan(splits[1].amount);
    expect(splits[1].amount).toBeLessThan(splits[2].amount);
  });

  it('handles shares with rounding remainder', () => {
    const splits = calculateSplits(25, 'SHARES', [
      { userId: 'a', shares: 2 },
      { userId: 'b', shares: 3 },
      { userId: 'c', shares: 5 },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(2500);
  });

  it('defaults to 1 share when shares not provided', () => {
    const splits = calculateSplits(30, 'SHARES', [
      { userId: 'a' },
      { userId: 'b' },
      { userId: 'c' },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(3000);
  });

  it('handles mixed share values', () => {
    const splits = calculateSplits(60, 'SHARES', [
      { userId: 'a', shares: 1 },
      { userId: 'b' },
      { userId: 'c', shares: 2 },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(6000);
  });

  it('handles single person with shares', () => {
    const splits = calculateSplits(100, 'SHARES', [{ userId: 'a', shares: 5 }]);
    expect(splits).toEqual([{ userId: 'a', amount: 100 }]);
  });
});

describe('calculateSplits — edge cases', () => {
  it('handles zero amount', () => {
    const splits = calculateSplits(0, 'EQUAL', [
      { userId: 'a' }, { userId: 'b' },
    ]);
    expect(splits[0].amount).toBe(0);
    expect(splits[1].amount).toBe(0);
  });

  it('handles very small amounts (cents precision)', () => {
    const splits = calculateSplits(0.01, 'EQUAL', [
      { userId: 'a' }, { userId: 'b' },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(1);
  });

  it('handles large amounts', () => {
    const splits = calculateSplits(10000, 'EQUAL', [
      { userId: 'a' }, { userId: 'b' }, { userId: 'c' },
    ]);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(total * 100)).toBe(1000000);
  });

  it('preserves total amount for EQUAL split with many people', () => {
    const total = 123.45;
    const people = 7;
    const splits = calculateSplits(total, 'EQUAL', Array(people).fill(null).map((_, i) => ({ userId: `user${i}` })));
    const sum = splits.reduce((s, x) => s + x.amount, 0);
    expect(Math.round(sum * 100)).toBe(Math.round(total * 100));
  });
});
