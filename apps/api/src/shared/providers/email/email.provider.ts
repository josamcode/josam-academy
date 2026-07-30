import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

import { loadEnv } from '../../../config/env.js';

/**
 * `EmailProvider` — `09 §providers`, `BR-1599`.
 *
 * ## Why this exists at `PH-1.4` when `resend` is a Phase 3 pin
 *
 * `13 §18.1` schedules the `resend` package at `PH-3.21`. But `PH-1.4` has to send a verification
 * link and a reset link, so something must send mail three phases earlier. That is not a
 * contradiction — it is exactly what the port is for. `13` lists `EmailProvider` with **"Resend |
 * any SMTP or API provider"**, and `BR-1596` / `DEC-47` already name MailHog as the local sink:
 * no developer ever sends real email locally.
 *
 * So the PORT lands here and the local transport is SMTP into MailHog. `PH-3.21` adds a Resend
 * implementation behind the same interface. `BR-1599` keeps the vendor SDK inside this directory,
 * so that swap touches no feature code.
 *
 * ## It does not swallow failures
 *
 * A send that fails is logged and RETHROWN. The tempting alternative — catch, log, carry on so
 * registration still "succeeds" — produces an account that can never be verified and a user with
 * no way to know why. `PH-1.4`'s callers decide what that means for the response; they must not be
 * handed a false success. (`BR-892`.)
 */

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text. Bilingual templating is `12`'s concern and arrives with `PH-3.21`. */
  text: string;
}

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor() {
    const env = loadEnv();
    this.from = env.MAIL_FROM;
    this.transporter = createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // MailHog speaks plain SMTP with no auth. `secure: false` is correct for it and would be
      // wrong for a real relay — which is why the real relay is a different implementation of
      // this port rather than a flag on this one.
      secure: false,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
    } catch (error: unknown) {
      // The address is not logged: an error log that echoes every address a reset was requested
      // for turns the log into the enumeration oracle the flow above it works to avoid
      // (`BR-1611`).
      this.logger.error(
        `failed to send "${message.subject}" — ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }
}
