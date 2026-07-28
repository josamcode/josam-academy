import './globals.css';

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
 * PH-0.4 scaffold root layout.
 *
 * `lang` and `dir` are hardcoded here only because packages/i18n does not exist until PH-0.13.
 * They become locale-driven there — RTL is a first-class direction, not an afterthought
 * (BR-1232), so this element is where that lands.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
