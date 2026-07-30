import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import { GoogleOAuthService } from './google-oauth.service.js';

/**
 * `PH-1.5` — built to the credential boundary.
 *
 * Everything that does not require a live Google project is implemented and asserted here. What
 * remains is one real round trip, which is the founder checklist.
 */

describe('PH-1.5 — Google OAuth (14 §2.4)', () => {
  const service = new GoogleOAuthService();

  describe('authorization request (BR-1618)', () => {
    // A client id must exist for the URL to be buildable at all.
    const withClientId = <T>(fn: () => T): T => {
      const previous = process.env['GOOGLE_CLIENT_ID'];
      process.env['GOOGLE_CLIENT_ID'] = 'test-client-id.apps.googleusercontent.com';
      try {
        return fn();
      } finally {
        if (previous === undefined) delete process.env['GOOGLE_CLIENT_ID'];
        else process.env['GOOGLE_CLIENT_ID'] = previous;
      }
    };

    it('uses the authorization CODE flow, never implicit (BR-1618)', () => {
      const { url } = withClientId(() => service.authorizationRequest('https://x.test/cb'));
      const params = new URL(url).searchParams;
      expect(params.get('response_type')).toBe('code');
      // `token` here would be the implicit flow, which BR-1618 prohibits outright.
      expect(params.get('response_type')).not.toBe('token');
    });

    it('sends the S256 CHALLENGE and keeps the verifier server-side (BR-1618)', () => {
      const { url, codeVerifier } = withClientId(() =>
        service.authorizationRequest('https://x.test/cb'),
      );
      const params = new URL(url).searchParams;

      expect(params.get('code_challenge_method')).toBe('S256');
      expect(params.get('code_challenge')).toBeTruthy();

      // The point of PKCE: the verifier must NOT travel with the request. A verifier in the URL
      // is a verifier the attacker also has, which makes the whole exchange decorative.
      expect(url).not.toContain(codeVerifier);
      expect(params.get('code_challenge')).not.toBe(codeVerifier);
    });

    it('issues INDEPENDENT state and verifier values', () => {
      const a = withClientId(() => service.authorizationRequest('https://x.test/cb'));
      const b = withClientId(() => service.authorizationRequest('https://x.test/cb'));
      // Reusing one value for both would let a leak of either compromise the other.
      expect(a.state).not.toBe(a.codeVerifier);
      // And they must not repeat across requests.
      expect(a.state).not.toBe(b.state);
      expect(a.codeVerifier).not.toBe(b.codeVerifier);
    });

    it('REFUSES to build a URL with no client id, rather than one that cannot complete', () => {
      const previous = process.env['GOOGLE_CLIENT_ID'];
      delete process.env['GOOGLE_CLIENT_ID'];
      try {
        expect(() => service.authorizationRequest('https://x.test/cb')).toThrow(
          /GOOGLE_CLIENT_ID is not configured/,
        );
      } finally {
        if (previous !== undefined) process.env['GOOGLE_CLIENT_ID'] = previous;
      }
    });
  });

  describe('state validation (BR-1619)', () => {
    it('accepts the matching value and rejects everything else', () => {
      const state = 'a'.repeat(43);
      expect(service.verifyState(state, state)).toBe(true);
      expect(service.verifyState(state, `${'a'.repeat(42)}b`)).toBe(false);
      expect(service.verifyState(state, 'a'.repeat(42))).toBe(false);
    });

    it('rejects an EMPTY state on both sides', () => {
      // The bug this catches: an absent state compared against an absent state "matches", so a
      // callback with no state at all sails through the CSRF check.
      expect(service.verifyState('', '')).toBe(false);
      expect(service.verifyState('abc', '')).toBe(false);
      expect(service.verifyState('', 'abc')).toBe(false);
    });
  });

  describe('id_token verification (BR-1620)', () => {
    const AUD = 'test-client-id.apps.googleusercontent.com';

    const withAudience = async <T>(fn: () => Promise<T>): Promise<T> => {
      const previous = process.env['GOOGLE_CLIENT_ID'];
      process.env['GOOGLE_CLIENT_ID'] = AUD;
      try {
        return await fn();
      } finally {
        if (previous === undefined) delete process.env['GOOGLE_CLIENT_ID'];
        else process.env['GOOGLE_CLIENT_ID'] = previous;
      }
    };

    /** A key set this test controls, so the POSITIVE path is assertable without a network call. */
    const withKeys = async () => {
      const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
      const jwk = await exportJWK(publicKey);
      jwk.kid = 'test-key';
      jwk.alg = 'RS256';
      const keySet = createLocalJWKSet({ keys: [jwk] });
      return { privateKey, keySet };
    };

    const sign = async (
      privateKey: CryptoKey,
      claims: Record<string, unknown>,
      overrides: { issuer?: string; audience?: string; expired?: boolean } = {},
    ): Promise<string> =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setSubject('123456789')
        .setIssuer(overrides.issuer ?? 'https://accounts.google.com')
        .setAudience(overrides.audience ?? AUD)
        .setIssuedAt()
        .setExpirationTime(overrides.expired === true ? '-1h' : '1h')
        .sign(privateKey);

    it('ACCEPTS a correctly signed token — the positive path, which proves the rest', async () => {
      const { privateKey, keySet } = await withKeys();
      const svc = new GoogleOAuthService(keySet);
      const token = await sign(privateKey, {
        email: 'learner@example.com',
        email_verified: true,
        name: 'Learner',
      });

      await withAudience(async () => {
        expect(await svc.verifyIdToken(token)).toEqual({
          providerUserId: '123456789',
          email: 'learner@example.com',
          emailVerified: true,
          name: 'Learner',
        });
      });
    });

    it('rejects a token signed by a DIFFERENT key (BR-1620 — signature)', async () => {
      const { keySet } = await withKeys();
      const other = await generateKeyPair('RS256', { extractable: true });
      const svc = new GoogleOAuthService(keySet);
      const token = await sign(other.privateKey, { email: 'a@b.test', email_verified: true });
      await withAudience(async () => {
        expect(await svc.verifyIdToken(token)).toBeNull();
      });
    });

    it('rejects a wrong ISSUER', async () => {
      const { privateKey, keySet } = await withKeys();
      const svc = new GoogleOAuthService(keySet);
      const token = await sign(
        privateKey,
        { email: 'a@b.test', email_verified: true },
        { issuer: 'https://evil.example' },
      );
      await withAudience(async () => {
        expect(await svc.verifyIdToken(token)).toBeNull();
      });
    });

    it('rejects a wrong AUDIENCE — a token minted for another application', async () => {
      const { privateKey, keySet } = await withKeys();
      const svc = new GoogleOAuthService(keySet);
      const token = await sign(
        privateKey,
        { email: 'a@b.test', email_verified: true },
        { audience: 'someone-elses-client-id' },
      );
      await withAudience(async () => {
        expect(await svc.verifyIdToken(token)).toBeNull();
      });
    });

    it('rejects an EXPIRED token — the fourth check BR-1620 lists', async () => {
      const { privateKey, keySet } = await withKeys();
      const svc = new GoogleOAuthService(keySet);
      const token = await sign(
        privateKey,
        { email: 'a@b.test', email_verified: true },
        { expired: true },
      );
      await withAudience(async () => {
        expect(await svc.verifyIdToken(token)).toBeNull();
      });
    });

    it('treats a NON-BOOLEAN email_verified as unverified', async () => {
      // Google has historically sent this as the string "true". Accepting a truthy string would
      // satisfy BR-1621 with a value that never passed Google's verification.
      const { privateKey, keySet } = await withKeys();
      const svc = new GoogleOAuthService(keySet);
      const token = await sign(privateKey, { email: 'a@b.test', email_verified: 'true' });
      await withAudience(async () => {
        expect((await svc.verifyIdToken(token))?.emailVerified).toBe(false);
      });
    });

    it('returns null rather than throwing on malformed input', async () => {
      const { keySet } = await withKeys();
      const svc = new GoogleOAuthService(keySet);
      await withAudience(async () => {
        expect(await svc.verifyIdToken('not.a.token')).toBeNull();
        expect(await svc.verifyIdToken('')).toBeNull();
      });
    });
  });

  describe('automatic linking (BR-1621)', () => {
    const identity = {
      providerUserId: '123',
      email: 'learner@example.com',
      emailVerified: true,
      name: null,
    };

    it('links when the email matches AND Google verified it', () => {
      expect(service.mayAutoLink(identity, 'learner@example.com')).toBe(true);
    });

    it('REFUSES when Google has not verified the email', () => {
      // Without this, anyone able to create a Google account claiming an address can take over
      // the account that already owns it here.
      expect(
        service.mayAutoLink({ ...identity, emailVerified: false }, 'learner@example.com'),
      ).toBe(false);
    });

    it('refuses when the addresses differ', () => {
      expect(service.mayAutoLink(identity, 'someone-else@example.com')).toBe(false);
    });

    it('matches case-insensitively, because the column is CITEXT', () => {
      expect(
        service.mayAutoLink({ ...identity, email: 'Learner@Example.COM' }, 'learner@example.com'),
      ).toBe(true);
    });
  });
});
