import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../token.service';

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '30d';

describe('token.service', () => {
  const userId = 'user-123';

  it('generateAccessToken returns a string', () => {
    const token = generateAccessToken(userId);
    expect(typeof token).toBe('string');
  });

  it('verifyAccessToken returns userId from valid token', () => {
    const token = generateAccessToken(userId);
    const result = verifyAccessToken(token);
    expect(result.userId).toBe(userId);
  });

  it('verifyAccessToken throws on invalid token', () => {
    expect(() => verifyAccessToken('bad-token')).toThrow();
  });

  it('generateRefreshToken returns a string', () => {
    const token = generateRefreshToken(userId);
    expect(typeof token).toBe('string');
  });

  it('verifyRefreshToken returns userId from valid token', () => {
    const token = generateRefreshToken(userId);
    const result = verifyRefreshToken(token);
    expect(result.userId).toBe(userId);
  });
});
