const crypto = require('crypto');

// Pure functions under test
function toKobo(naira) {
  return Math.round(naira * 100);
}

function buildReference(runId, entryId, attemptNumber = 1) {
  const runIdStr = runId.toString().slice(-6);
  const entryIdStr = entryId.toString().slice(-8);
  return `thc-${runIdStr}-${entryIdStr}-${attemptNumber}`;
}

function verifyPaystackSignature(body, signature, secret) {
  if (!secret) return false;
  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

// Tests
describe('Payroll Payment Pure Functions', () => {
  describe('toKobo', () => {
    test('converts naira to kobo correctly', () => {
      expect(toKobo(100)).toBe(10000);
      expect(toKobo(1)).toBe(100);
      expect(toKobo(0.5)).toBe(50);
    });

    test('rounds to nearest whole number', () => {
      expect(toKobo(1.5)).toBe(150);
      expect(toKobo(100.456)).toBe(10046);
    });

    test('handles zero', () => {
      expect(toKobo(0)).toBe(0);
    });
  });

  describe('buildReference', () => {
    test('builds reference with default attempt number', () => {
      const ref = buildReference('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');
      expect(ref).toMatch(/^thc-[a-z0-9]+-[a-z0-9]+-1$/);
    });

    test('uses last 6 chars of runId and last 8 of entryId', () => {
      const runId = '507f1f77bcf86cd799439011'; // last 6: 439011
      const entryId = '507f1f77bcf86cd799439012'; // last 8: 99439012
      const ref = buildReference(runId, entryId, 1);
      expect(ref).toContain('439011');
      expect(ref).toContain('99439012');
    });

    test('increments attempt number', () => {
      const ref1 = buildReference('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', 1);
      const ref2 = buildReference('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012', 2);
      expect(ref1).toEndWith('-1');
      expect(ref2).toEndWith('-2');
    });

    test('only uses lowercase letters, digits, and hyphens', () => {
      const ref = buildReference('ABCDEFABCDEFABCDEFABCDEF12', '12ABCDEFABCDEFABCDEFABCDEF12');
      expect(ref).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe('verifyPaystackSignature', () => {
    test('accepts valid signature', () => {
      const secret = 'test_secret_key';
      const body = JSON.stringify({ test: 'data' });
      const hash = crypto
        .createHmac('sha512', secret)
        .update(body)
        .digest('hex');
      
      expect(verifyPaystackSignature(body, hash, secret)).toBe(true);
    });

    test('rejects invalid signature', () => {
      const secret = 'test_secret_key';
      const body = JSON.stringify({ test: 'data' });
      const wrongHash = 'invalid_hash';
      
      expect(verifyPaystackSignature(body, wrongHash, secret)).toBe(false);
    });

    test('rejects signature with wrong secret', () => {
      const secret = 'test_secret_key';
      const wrongSecret = 'wrong_secret_key';
      const body = JSON.stringify({ test: 'data' });
      const hash = crypto
        .createHmac('sha512', secret)
        .update(body)
        .digest('hex');
      
      expect(verifyPaystackSignature(body, hash, wrongSecret)).toBe(false);
    });

    test('returns false when secret is missing', () => {
      const body = JSON.stringify({ test: 'data' });
      const hash = 'some_hash';
      
      expect(verifyPaystackSignature(body, hash, null)).toBe(false);
      expect(verifyPaystackSignature(body, hash, '')).toBe(false);
    });

    test('rejects signature if body is modified', () => {
      const secret = 'test_secret_key';
      const body = JSON.stringify({ test: 'data' });
      const hash = crypto
        .createHmac('sha512', secret)
        .update(body)
        .digest('hex');
      
      const modifiedBody = JSON.stringify({ test: 'modified' });
      expect(verifyPaystackSignature(modifiedBody, hash, secret)).toBe(false);
    });
  });
});
