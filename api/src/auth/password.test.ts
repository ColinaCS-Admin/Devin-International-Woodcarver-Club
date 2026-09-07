import { describe, expect, it } from 'vitest';
import { hashPassword, passwordPolicyErrors, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const encoded = await hashPassword('Woodcarver!2026');
    expect(await verifyPassword('Woodcarver!2026', encoded)).toBe(true);
    expect(await verifyPassword('woodcarver!2026', encoded)).toBe(false);
  });

  it('produces a different hash per call', async () => {
    expect(await hashPassword('Woodcarver!2026')).not.toBe(await hashPassword('Woodcarver!2026'));
  });

  it('rejects a malformed encoding', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
  });
});

describe('password policy', () => {
  it('accepts a compliant password', () => {
    expect(passwordPolicyErrors('Woodcarver!2026')).toEqual([]);
  });

  it('reports every unmet rule', () => {
    expect(passwordPolicyErrors('short')).toHaveLength(3);
  });
});
