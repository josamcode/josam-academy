import './globals.css';

import { DEFAULT_LOCALE, directionOf } from '@josam/i18n';
import type { Metadata, Viewport } from 'next';
import { Almarai, Amiri, IBM_Plex_Mono, Newsreader } from 'next/font/google';
import type { ReactNode } from 'react';

/**
 * The 12C §3 faces, self-hosted through next/font (DT-1).
 *
 * next/font registers each face under a hashed family name, so the token stacks in
 * `packages/tokens` cannot name the families directly — each stack leads with the `variable`
 * declared here (`--font-almarai` etc.), and the classes on `<html>` are what define those
 * variables. Remove one here and its stack silently falls through to the named fallback, which
 * is why the variable names are part of the token layer's contract.
 *
 * Weights are the locked set: Almarai 400/700/800; Amiri 700 only — display tier only, never
 * under 28px; IBM Plex Mono 400/500. Newsreader is a variable face loaded in both styles — the
 * reference screens use upright 500 and italic 400 — and carries the display tier only when the
 * interface is English (the swap lives in the generated tokens.css, keyed on `html[lang]`).
 * `display: 'swap'` keeps every face off the critical path: body and UI paint in the fallback
 * immediately, per the foundations screen's loading rules.
 */
const almarai = Almarai({
  weight: ['400', '700', '800'],
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-almarai',
});

const amiri = Amiri({
  weight: '700',
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-amiri',
});

const plexMono = IBM_Plex_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plex-mono',
});

const newsreader = Newsreader({
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-newsreader',
});

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
 * document direction with it (BR-1232, BR-1237) — and the display face with it (12C §3).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang={DEFAULT_LOCALE}
      dir={directionOf(DEFAULT_LOCALE)}
      className={`${almarai.variable} ${amiri.variable} ${plexMono.variable} ${newsreader.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
