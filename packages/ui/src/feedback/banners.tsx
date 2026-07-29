'use client';

import { AlertTriangle, CheckCircle2, Info, Lock, WifiOff, XCircle } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

import { Inline, Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';

/**
 * `InlineAlert` · `OfflineBanner` · `ReadOnlyBanner`.
 *
 * All three are status messages that live in the page rather than over it. Nothing here uses a
 * `role="alert"` by default: an alert interrupts whatever a screen reader is saying, which is
 * correct for an error the user just caused and wrong for a banner that was there when they
 * arrived.
 */

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

/**
 * Each tone is a **boundary colour and a text colour**, on an ordinary surface.
 *
 * `SB-18` defined exactly two tokens per status, and `packages/tokens/src/color.spec.ts` pins
 * exactly those two: `--{status}` clears **3:1 on `bg-base`** as a UI boundary, and
 * `--{status}-text` clears **4.5:1 on `bg-base`** as body text.
 *
 * `PH-0.27` used `bg-{status}` as a **filled** background with text on top — a third composition
 * the token system does not have and never tested. Nothing could catch it: jsdom applies no CSS,
 * so the component specs' axe runs had no colours to measure. The Storybook sweep at `PH-0.30`,
 * in a real browser, measured `#18181b` on `#dc2626` at **3.66:1** and `#fafafa` on `#60a5fa` at
 * **2.43:1**.
 *
 * The fix uses only what was specified. The surface is `bg-bg-surface`, where body text is already
 * pinned at 4.5:1; the status colour becomes the **border**, which is what a 3:1 boundary token is
 * for; and `--{status}-text` colours the icon. Filling a panel with a status colour would need a
 * `--{status}-subtle` surface token that does not exist, and inventing one is a design decision
 * rather than a fix.
 */
const TONE: Record<AlertTone, { border: string; accent: string; icon: typeof Info }> = {
  info: { border: 'border-info', accent: 'text-info-text', icon: Info },
  success: { border: 'border-success', accent: 'text-success-text', icon: CheckCircle2 },
  warning: { border: 'border-warning', accent: 'text-warning-text', icon: AlertTriangle },
  danger: { border: 'border-danger', accent: 'text-danger-text', icon: XCircle },
};
export interface InlineAlertProps {
  tone: AlertTone;
  /** Pre-translated. */
  title: string;
  /** Pre-translated. */
  body?: string;
  /** An action that resolves the alert — a retry, a link to the setting that caused it. */
  action?: ReactNode;
  /**
   * Announce immediately, interrupting the screen reader.
   *
   * Off by default and worth a moment's thought each time it is switched on. `assertive` is right
   * for the result of something the user just did; it is wrong for a banner already on the page,
   * which it will read over the top of whatever they were listening to.
   */
  assertive?: boolean;
}

export function InlineAlert({ tone, title, body, action, assertive = false }: InlineAlertProps) {
  const { border, accent, icon: Icon } = TONE[tone];

  return (
    <div
      role={assertive ? 'alert' : 'status'}
      className={`flex flex-row items-start gap-3 rounded-md border-2 bg-bg-surface p-3 text-text-primary ${border}`}
    >
      {/*
        The icon is decorative: the tone is already carried by role and by the text. An
        aria-labelled icon here would make a screen reader announce "warning warning".
      */}
      <Icon
        width={18}
        height={18}
        aria-hidden="true"
        focusable="false"
        // The status colour lives here, on the one element whose only job is to signal it.
        className={`mt-0.5 shrink-0 ${accent}`}
      />
      <Stack gap="1">
        <Text size="sm" weight="medium">
          {title}
        </Text>
        {body === undefined ? null : <Text size="sm">{body}</Text>}
        {action === undefined ? null : <div className="mt-1">{action}</div>}
      </Stack>
    </div>
  );
}

export interface OfflineBannerProps {
  /** Pre-translated. */
  message: string;
  /** Forces the offline state. Omit to track `navigator.onLine`. */
  offline?: boolean;
}

/**
 * Shows only while the browser reports no connection.
 *
 * Two details that decide whether this is useful or actively misleading:
 *
 *  - **It starts as online and corrects itself on mount.** Reading `navigator.onLine` during render
 *    is a server/client mismatch in an app that renders on the server, where there is no navigator
 *    at all. Starting online and correcting in an effect means the worst case is a banner appearing
 *    a frame late, rather than a hydration error.
 *  - **`navigator.onLine` means "has a network interface", not "can reach the server".** It is
 *    false negatives all the way down: a captive portal, a dead uplink and a down API all report
 *    online. So this banner is a hint, never the mechanism a failed request relies on — that is
 *    `QueryBoundary`'s error state, which knows the request actually failed.
 */
export function OfflineBanner({ message, offline }: OfflineBannerProps) {
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    if (offline !== undefined) return;

    const update = () => {
      setDetected(!navigator.onLine);
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [offline]);

  const isOffline = offline ?? detected;
  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="flex flex-row items-center justify-center gap-2 border-b-2 border-warning bg-bg-surface p-2 text-text-primary"
    >
      <WifiOff width={16} height={16} aria-hidden="true" focusable="false" />
      <Text size="sm">{message}</Text>
    </div>
  );
}

export interface ReadOnlyBannerProps {
  /** Pre-translated. */
  message: string;
  /** Pre-translated. Why the screen is read-only — never omitted (`BR-1347`). */
  reason: string;
}

/**
 * Shown when a screen renders data the current user cannot change.
 *
 * `reason` is required, not optional. A banner saying "read only" and nothing else leaves the user
 * to guess between "my role does not allow this", "this record is locked" and "the system is in
 * maintenance", which are three different next actions.
 */
export function ReadOnlyBanner({ message, reason }: ReadOnlyBannerProps) {
  return (
    <div
      role="status"
      className="flex flex-row items-center gap-2 rounded-md border-2 border-info bg-bg-surface p-3 text-text-primary"
    >
      <Lock width={16} height={16} aria-hidden="true" focusable="false" className="shrink-0" />
      <Inline gap="2">
        <Text size="sm" weight="medium">
          {message}
        </Text>
        <Text size="sm">{reason}</Text>
      </Inline>
    </div>
  );
}
