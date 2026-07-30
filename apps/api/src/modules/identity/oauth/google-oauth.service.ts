import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { Injectable, Logger, Optional } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

import { loadEnv } from '../../../config/env.js';

/**
 * `PH-1.5` — Google sign-in. `14 §2.4`.
 *
 * ```
 * BR-1618  authorization code flow with PKCE; implicit flow is prohibited
 * BR-1619  `state` validated on every callback (CSRF)
 * BR-1620  id_token signature, issuer, audience and expiry verified SERVER-SIDE
 * BR-1621  automatic linking requires a VERIFIED matching email; phones never auto-link
 * ```
 *
 * ## What each control actually stops, because "we do OAuth" hides all of it
 *
 * **PKCE** stops an authorization code stolen from the redirect (a malicious app registered on
 * the same custom scheme, a leaked `Referer`, browser history) from being exchanged: without the
 * original `code_verifier` the code is inert. This matters even for a confidential web client,
 * because the code travels through the user agent and the secret does not.
 *
 * **`state`** stops an attacker completing *their* Google login inside *your* session — you end
 * up signed into the attacker's account and any data you then enter is theirs. It is CSRF on the
 * login itself, and it is the control most often reduced to "we send a random string" without the
 * callback ever comparing it.
 *
 * **Server-side `id_token` verification** stops the client simply saying who it is. A token
 * received from the browser is an assertion by the browser until the signature, issuer, audience
 * AND expiry are checked here. `BR-1620` lists all four because checking three is the common bug.
 */

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

export interface AuthorizationRequest {
  url: string;
  /** Held server-side against the session; the callback must present the same value. */
  state: string;
  /** Held server-side; never sent to Google in the authorization request. */
  codeVerifier: string;
}

export interface GoogleIdentity {
  providerUserId: string;
  email: string;
  /** `BR-1621` — auto-linking is refused unless this is true. */
  emailVerified: boolean;
  name: string | null;
}

export type CallbackResult =
  | { status: 'ok'; identity: GoogleIdentity }
  | { status: 'state_mismatch' }
  | { status: 'invalid_token' };

/** `BR-1618` — RFC 7636 S256. `plain` is not offered; it protects nothing. */
function challengeFor(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);
  private readonly jwks: JWTVerifyGetKey;

  /**
   * The key set is injectable so `verifyIdToken`'s CLAIM checks can be exercised without a
   * network call.
   *
   * The first version of this spec signed a token with its own key and asserted rejection against
   * Google's live JWKS. It passed — and it would have passed identically with the network down,
   * because an unreachable key set also yields a rejection. **A test that cannot distinguish "the
   * signature was wrong" from "we could not check" is not testing the signature** (`BR-1841`).
   * Injecting the key set makes the positive path — a token that SHOULD verify — assertable, and
   * a positive path is what proves the verifier is reachable at all.
   */
  // `@Optional()` for the same reason as `BreachList`'s: without it Nest cannot resolve the
  // parameter and refuses to build the graph. Caught by `security.module.spec.ts` within minutes
  // of that gate existing — which is the argument for the gate.
  constructor(@Optional() jwks?: JWTVerifyGetKey) {
    this.jwks = jwks ?? createRemoteJWKSet(GOOGLE_JWKS_URL);
  }

  /**
   * Step 1 — build the authorization URL.
   *
   * The verifier is returned to the CALLER to store server-side, never embedded in the URL. A
   * verifier that travels with the request is a verifier the attacker also has, which turns PKCE
   * into decoration.
   */
  authorizationRequest(redirectUri: string): AuthorizationRequest {
    const { GOOGLE_CLIENT_ID } = loadEnv();
    if (GOOGLE_CLIENT_ID === undefined || GOOGLE_CLIENT_ID === '') {
      throw new Error(
        'GOOGLE_CLIENT_ID is not configured — refusing to build an authorization URL that ' +
          'cannot complete. See the PH-1.5 founder checklist.',
      );
    }

    // 32 bytes each. `state` is a CSRF nonce and `codeVerifier` a PKCE secret; they are
    // independent values, and reusing one for both would let a leak of either compromise the other.
    const state = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(32).toString('base64url');

    const url = new URL(AUTH_ENDPOINT);
    url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code'); // BR-1618 — never `token`
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challengeFor(codeVerifier));
    url.searchParams.set('code_challenge_method', 'S256');
    // Without this Google omits `email_verified` for returning users, and BR-1621 depends on it.
    url.searchParams.set('prompt', 'select_account');

    return { url: url.toString(), state, codeVerifier };
  }

  /**
   * `BR-1619` — constant-time, because `===` returns at the first differing byte and leaks how
   * much of a guess was right.
   */
  verifyState(expected: string, received: string): boolean {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(received, 'utf8');
    if (a.length !== b.length || a.length === 0) return false;
    return timingSafeEqual(a, b);
  }

  /**
   * `BR-1620` — verify the `id_token` against Google's published keys.
   *
   * Separated from the code exchange so it is testable without a network round trip to Google's
   * token endpoint, and so the verification can be exercised against a token this repository
   * signs itself.
   */
  async verifyIdToken(idToken: string): Promise<GoogleIdentity | null> {
    const { GOOGLE_CLIENT_ID } = loadEnv();
    if (GOOGLE_CLIENT_ID === undefined || GOOGLE_CLIENT_ID === '') return null;

    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: GOOGLE_ISSUERS,
        audience: GOOGLE_CLIENT_ID,
        // `jose` enforces `exp` by default; stated because BR-1620 lists expiry explicitly and
        // "it is the default" is how a control gets removed later without anyone noticing.
      });

      const { sub } = payload;
      const email = payload['email'];
      const emailVerified = payload['email_verified'];
      const name = payload['name'];

      if (typeof sub !== 'string' || sub === '') return null;
      if (typeof email !== 'string' || email === '') return null;

      return {
        providerUserId: sub,
        email,
        // Anything other than boolean `true` is NOT verified. Google has historically sent this
        // as the string "true"; treating a truthy string as verified would satisfy BR-1621 with
        // a value that never went through Google's verification.
        emailVerified: emailVerified === true,
        name: typeof name === 'string' && name !== '' ? name : null,
      };
    } catch (error: unknown) {
      this.logger.warn(
        `google id_token rejected — ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }

  /**
   * `BR-1621` — automatic linking requires a **verified** matching email.
   *
   * An unverified Google email would let anyone who can create a Google account claiming
   * `victim@example.com` take over that account here. Google's `email_verified` is the only
   * evidence that the address belongs to whoever is signing in.
   */
  mayAutoLink(identity: GoogleIdentity, existingEmail: string): boolean {
    if (!identity.emailVerified) return false;
    // Case-insensitive: the database column is CITEXT and Google may return either case.
    return identity.email.toLowerCase() === existingEmail.toLowerCase();
  }
}
