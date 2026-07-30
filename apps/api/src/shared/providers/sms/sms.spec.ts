import { describe, expect, it } from 'vitest';

import { SmsProvider, maskPhone } from './sms.provider.js';

/**
 * `PH-1.6` — built to the credential boundary.
 *
 * The port, the transport selection and the flag are complete and asserted. What remains is the
 * Twilio Verify call itself, which needs an account the founder holds.
 */

describe('PH-1.6 — SmsProvider (DEC-45, BR-1596)', () => {
  const provider = new SmsProvider();

  const withEnv = async <T>(vars: Record<string, string | undefined>, fn: () => Promise<T> | T) => {
    const previous: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(vars)) {
      previous[k] = process.env[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    try {
      return await fn();
    } finally {
      for (const [k, v] of Object.entries(previous)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };

  it('the flag defaults OFF, so the feature cannot reach users unannounced', async () => {
    await withEnv({ PHONE_OTP_ENABLED: undefined }, () => {
      expect(provider.enabled()).toBe(false);
    });
  });

  it('the flag disables CLEANLY — sending refuses rather than silently no-opping', async () => {
    // The task's stated output. A no-op would let a caller believe a code was sent and leave the
    // user waiting for a message that was never dispatched.
    await withEnv({ PHONE_OTP_ENABLED: 'false' }, async () => {
      await expect(provider.sendOtp('+201234567890', '123456')).rejects.toThrow(
        /phone OTP is disabled/,
      );
    });
  });

  it('selects the transport on CREDENTIAL PRESENCE, not on NODE_ENV', async () => {
    await withEnv(
      {
        NODE_ENV: 'production',
        TWILIO_ACCOUNT_SID: undefined,
        TWILIO_AUTH_TOKEN: undefined,
        TWILIO_VERIFY_SERVICE_SID: undefined,
      },
      () => {
        // Switching on NODE_ENV would send real messages here. An environment with no credentials
        // cannot send, and must say so rather than try.
        expect(provider.transport()).toBe('console');
      },
    );

    await withEnv(
      {
        NODE_ENV: 'development',
        TWILIO_ACCOUNT_SID: 'AC_test',
        TWILIO_AUTH_TOKEN: 'token_test',
        TWILIO_VERIFY_SERVICE_SID: 'VA_test',
      },
      () => {
        expect(provider.transport()).toBe('twilio');
      },
    );
  });

  it('logs to the console and returns the code when there is no provider (BR-1596)', async () => {
    await withEnv(
      {
        PHONE_OTP_ENABLED: 'true',
        TWILIO_ACCOUNT_SID: undefined,
        TWILIO_AUTH_TOKEN: undefined,
        TWILIO_VERIFY_SERVICE_SID: undefined,
      },
      async () => {
        const result = await provider.sendOtp('+201234567890', '654321');
        expect(result.transport).toBe('console');
        expect(result.code).toBe('654321');
      },
    );
  });

  it('the flag ON with no credentials DEGRADES to console — it does not throw', async () => {
    // Otherwise enabling the flag in development breaks the login page, and the flag becomes
    // something nobody dares turn on.
    await withEnv({ PHONE_OTP_ENABLED: 'true', TWILIO_ACCOUNT_SID: undefined }, async () => {
      await expect(provider.sendOtp('+201234567890', '111111')).resolves.toMatchObject({
        transport: 'console',
      });
    });
  });

  it('masks the number in logs — a development log is still a log', () => {
    expect(maskPhone('+201234567890')).toBe('+2012****7890');
    expect(maskPhone('+201234567890')).not.toContain('34567');
    expect(maskPhone('12345')).toBe('*****');
  });
});
