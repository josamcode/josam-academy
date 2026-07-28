import './globals.css';

import { DEFAULT_LOCALE, directionOf } from '@josam/i18n';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Josam Academy',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * Root layout.
 *
 * `lang` and `dir` are driven by @josam/i18n as of PH-0.13. The locale is fixed to the default
 * here; resolving it per request from the URL segment and the user's preference is Phase 1 work,
 * but the direction is already derived rather than written, so switching the locale switches the
 * document direction with it (BR-1232, BR-1237).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} dir={directionOf(DEFAULT_LOCALE)}>
      <body>{children}</body>
    </html>
  );
}
