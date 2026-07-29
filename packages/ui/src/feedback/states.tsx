'use client';

import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '../controls/Button.js';
import { Heading } from '../primitives/Heading.js';
import { Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';

/**
 * `EmptyState` · `ErrorState` — the two ends of `QueryBoundary`'s state matrix that are not data.
 */

export interface EmptyStateProps {
  /** Pre-translated. */
  title: string;
  /** Pre-translated. What the user can do about it, not a restatement of the title. */
  body: string;
  /**
   * `BR-1551` / `BR-1363` — **required**. An empty state without a way out is not permitted.
   *
   * Required rather than optional, and that is the entire point of the component. An empty screen
   * with no action is a dead end the user has to navigate away from to escape, and it is exactly
   * what gets shipped when the prop is optional and the deadline is close. Making it required
   * means the person building the screen has to decide what the user should do next — which is
   * the design work the rule is really asking for.
   */
  action: ReactNode;
  icon?: LucideIcon;
}

export function EmptyState({ title, body, action, icon }: EmptyStateProps) {
  const Icon = icon ?? Inbox;

  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <Icon
        width={32}
        height={32}
        aria-hidden="true"
        focusable="false"
        className="text-text-muted"
      />
      <Stack gap="2">
        {/* Level 2 — the page's h1 belongs to PageHeader (BR-1548, BR-1472). */}
        <Heading level={2} size="lg">
          {title}
        </Heading>
        <Text size="sm" tone="secondary" align="center">
          {body}
        </Text>
      </Stack>
      <div>{action}</div>
    </div>
  );
}

export interface ErrorStateProps {
  /** Pre-translated. */
  title: string;
  /** Pre-translated. */
  body: string;
  /** Pre-translated, labels the retry control. */
  retryLabel: string;
  /**
   * `BR-1537` / `BR-1418` — re-runs the failed request **only**.
   *
   * Never `location.reload()`. A reload throws away every other query on the screen, the scroll
   * position, and any half-filled form, in order to retry one call — and if the failure is
   * persistent it does all that to arrive at the same error.
   */
  onRetry: () => void;
  /**
   * A correlation id, shown verbatim so a user can quote it in a support message.
   *
   * The raw error is deliberately not rendered: it is written for whoever reads the logs, not for
   * the person looking at the screen, and it routinely contains things that should not be on a
   * user's display. `PH-0.19` put a correlation id on every request precisely so this is possible.
   */
  correlationId?: string;
}

export function ErrorState({ title, body, retryLabel, onRetry, correlationId }: ErrorStateProps) {
  return (
    // `alert`: this is the result of something the user just did, so interrupting is correct — the
    // opposite of a banner that was already on the page when they arrived.
    <div role="alert" className="flex flex-col items-center gap-4 p-8 text-center">
      <AlertTriangle
        width={32}
        height={32}
        aria-hidden="true"
        focusable="false"
        className="text-danger-text"
      />
      <Stack gap="2">
        <Heading level={2} size="lg">
          {title}
        </Heading>
        <Text size="sm" tone="secondary" align="center">
          {body}
        </Text>
      </Stack>
      <Button variant="primary" onClick={onRetry}>
        {retryLabel}
      </Button>
      {correlationId === undefined ? null : (
        <Text size="xs" tone="muted">
          {/* LTR: an id is a code, and mirroring it makes it unreadable back to support. */}
          <code dir="ltr" className="font-mono">
            {correlationId}
          </code>
        </Text>
      )}
    </div>
  );
}
