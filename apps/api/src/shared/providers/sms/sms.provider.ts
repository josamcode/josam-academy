import { Injectable, Logger } from '@nestjs/common';

import { loadEnv } from '../../../config/env.js';

/**
 * `PH-1.6` — `SmsProvider`. `DEC-45`, `13 §8.1`, `BR-1599`.
 *
 * ## Two transports, chosen by whether credentials exist — not by NODE_ENV
 *
 * `BR-1596` / `DEC-47`: no developer ever sends a real SMS locally; SMS logs to the console in
 * development. The obvious implementation switches on `NODE_ENV === 'production'`, and that is
 * the wrong condition. It sends real messages the moment anything sets `NODE_ENV=production` —
 * a staging box, a container someone copied, a CI job — whether or not that environment was meant
 * to have a live provider.
 *
 * Selecting on **credential presence** ties the behaviour to the thing that actually determines
 * whether sending is possible. An environment without Twilio credentials cannot send, and now
 * says so instead of failing at the API call.
 *
 * **`NODE_ENV` is a variable anything can set. Credential presence is the thing that decides
 * whether a message can physically be sent.** The failure mode of getting this wrong is specific
 * and expensive: a staging box, or a container someone copied, quietly starts sending real SMS
 * and charging per message. It looks like a configuration typo from the inside and reads as
 * fraud on the invoice — and nothing in the application would report anything wrong, because
 * from its point of view every send succeeded.
 *
 * ## The flag is separate from the transport, and both are checked
 *
 * `PHONE_OTP_ENABLED` gates the FEATURE. The transport choice gates HOW it sends. They are
 * independent: the flag being on with no credentials must degrade to console logging, not to an
 * exception, or enabling the flag in development breaks the login page.
 */

export type SmsTransport = 'twilio' | 'console';

export interface OtpDispatch {
  transport: SmsTransport;
  /** Present only on the console transport — a real provider never returns the code. */
  code?: string;
}

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);

  /**
   * Which transport this environment will use, and why. Exposed so `/health` and the specs can
   * assert it rather than infer it — a provider that silently picked the wrong transport is
   * exactly the failure this project keeps finding (`BR-1830`).
   */
  transport(): SmsTransport {
    const env = loadEnv();
    const configured =
      env.TWILIO_ACCOUNT_SID !== undefined &&
      env.TWILIO_AUTH_TOKEN !== undefined &&
      env.TWILIO_VERIFY_SERVICE_SID !== undefined;
    return configured ? 'twilio' : 'console';
  }

  /** `DEC-45` — the feature flag, independent of the transport. */
  enabled(): boolean {
    return loadEnv().PHONE_OTP_ENABLED;
  }

  /**
   * Send a verification code.
   *
   * On the console transport the code is RETURNED as well as logged, so `PH-1.6`'s specs and a
   * developer can complete the flow. It is returned only on that transport: a real provider must
   * never hand the code back to the caller, because the caller is one refactor away from putting
   * it in an HTTP response.
   */
  sendOtp(phone: string, code: string): Promise<OtpDispatch> {
    if (!this.enabled()) {
      return Promise.reject(
        new Error(
          'phone OTP is disabled (PHONE_OTP_ENABLED=false) — refusing to send. The caller must ' +
            'check `enabled()` and offer email instead (DEC-45).',
        ),
      );
    }

    if (this.transport() === 'console') {
      // The number is masked even locally: a development log is still a log, and it is the file
      // most likely to be pasted into a chat window.
      this.logger.warn(
        `SMS (console transport — nothing was sent): OTP for ${maskPhone(phone)} is ${code}`,
      );
      return Promise.resolve({ transport: 'console', code });
    }

    // `PH-1.6` builds to the credential boundary. The Twilio Verify call belongs here, inside
    // `shared/providers` (`BR-1599`), and needs an account the founder holds. Until those
    // credentials exist this path is unreachable — `transport()` returns `console` without them —
    // so it rejects rather than pretending to have sent something.
    //
    // NOT `async` with a bare `throw`, and not an `eslint-disable`. The method has nothing to
    // await yet, so `async` would be a lie the linter correctly objects to (`BR-1512` — never
    // silence a rule to get green). Returning settled promises keeps the contract identical for
    // callers and stays honest until the Twilio call makes `async` true.
    return Promise.reject(
      new Error(
        'Twilio credentials are present but the Verify integration is not implemented yet — ' +
          'PH-1.6 was built to the credential boundary. See the founder checklist.',
      ),
    );
  }
}

/**
 * `+201234567890` → `+2012****7890`. Enough to correlate a support conversation, not enough to
 * dial. `14 §` redaction discipline: a phone number is personal data in a log line.
 */
export function maskPhone(phone: string): string {
  if (phone.length <= 8) return '*'.repeat(phone.length);
  return `${phone.slice(0, 5)}${'*'.repeat(phone.length - 9)}${phone.slice(-4)}`;
}
