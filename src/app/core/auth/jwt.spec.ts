import { readIdToken } from './jwt';

export function fakeIdToken(claims: Record<string, unknown>): string {
  const encode = (value: object) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'RS256' })}.${encode(claims)}.signature`;
}

describe('readIdToken', () => {
  it('reads the email, the authorities and the expiry of a Cognito id_token', () => {
    const token = fakeIdToken({
      email: 'zoé@studely.com',
      'custom:authorities': 'ROLE_GATEKEEPER_ADMIN, ROLE_ADMIN',
      exp: 1_800_000_000,
    });

    expect(readIdToken(token)).toEqual({
      email: 'zoé@studely.com',
      authorities: ['ROLE_GATEKEEPER_ADMIN', 'ROLE_ADMIN'],
      expiresAt: new Date(1_800_000_000_000),
    });
  });

  it('returns no authorities when the claim is missing', () => {
    expect(readIdToken(fakeIdToken({ exp: 1 }))?.authorities).toEqual([]);
  });

  it('rejects a malformed token or a token without expiry', () => {
    expect(readIdToken('not-a-jwt')).toBeNull();
    expect(readIdToken(fakeIdToken({ email: 'a@b.c' }))).toBeNull();
  });
});
