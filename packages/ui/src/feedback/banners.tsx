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
 * Each tone is a **surface token and a text token**, never one colour used for both.
 *
 * `SB-18` — a status colour that clears 4.5:1 as text is too dark to be a background, and one that
 * works as a background fails as text. The pairs were computed and pinned at `PH-0.12`.
 */
const TONE: Record<AlertTone, { surface: string; icon: typeof Info }> = {
  info: { surface: 'bg-info border-info-text text-info-text', icon: Info },
  success: { surface: 'bg-success border-success-text text-success-text', icon: CheckCircle2 },
  warning: { surface: 'bg-warning border-warning-text text-warning-text', icon: AlertTriangle },
  danger: { surface: 'bg-danger border-danger-text text-danger-text', icon: XCircle },
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
  const { surface, icon: Icon } = TONE[tone];

  return (
    <div
      role={assertive ? 'alert' : 'status'}
      className={`flex flex-row items-start gap-3 rounded-md border p-3 ${surface}`}
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
        className="mt-0.5 shrink-0"
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
      className="flex flex-row items-center justify-center gap-2 border-b border-warning-text bg-warning p-2 text-warning-text"
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
      className="flex flex-row items-center gap-2 rounded-md border border-info-text bg-info p-3 text-info-text"
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
