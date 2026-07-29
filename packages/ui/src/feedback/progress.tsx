'use client';

import * as RadixProgress from '@radix-ui/react-progress';
import { useMemo } from 'react';

import { Text } from '../primitives/Text.js';

/**
 * `Skeleton` · `ProgressBar` · `ProgressRing`.
 *
 * All three answer "something is happening", and the difference between them is what the user can
 * do with the answer: a skeleton says *where* content will appear, a bar says *how far along* a
 * known-length task is, a ring says the same in a space too small for a bar.
 */

export interface SkeletonProps {
  /** How many lines. A single block for an avatar or a card; several for a paragraph. */
  lines?: number;
  /** `text` matches the line-height of body copy; `block` fills its container. */
  variant?: 'text' | 'block' | 'circle';
  /** Pre-translated. Announced once while the region is loading. */
  label: string;
}

/**
 * The placeholder that reserves the space content will occupy.
 *
 * Two decisions worth stating:
 *
 *  - **It announces once, through `aria-busy` on a `status` region, and its bars are hidden.**
 *    Six `aria-hidden="false"` grey rectangles is six announcements of nothing. The user needs to
 *    know the region is loading, not how many rectangles were used to say so.
 *  - **The last line is short**, so a paragraph skeleton reads as prose rather than as a table.
 */
export function Skeleton({ lines = 1, variant = 'text', label }: SkeletonProps) {
  const shape =
    variant === 'circle'
      ? 'rounded-full size-10'
      : variant === 'block'
        ? 'rounded-md h-24'
        : 'rounded-sm h-4';

  /*
    BR-1429 rejected `key={index}` here, and rather than reach for a template literal — which would
    slip past the rule's selector without changing anything (`SB-20`) — each row carries an `id`.
    Position genuinely IS this list's identity: row two is row two, there is nothing to reorder and
    no state to lose. Giving the row an id says that explicitly, and the day these rows carry real
    data the id comes from the data instead of from here.
  */
  const rows = useMemo(
    () =>
      Array.from({ length: lines }, (_, index) => ({
        id: `row-${String(index)}`,
        // The last line of a multi-line text skeleton is short. Equal-length bars read as a table;
        // the ragged last line is what makes it read as the prose it stands in for.
        width: variant === 'text' && index === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full',
      })),
    [lines, variant],
  );

  return (
    <div role="status" aria-busy="true" aria-label={label} className="flex flex-col gap-2">
      {rows.map((row) => (
        <div
          key={row.id}
          aria-hidden="true"
          className={`animate-pulse bg-bg-inset ${shape} ${row.width}`}
        />
      ))}
    </div>
  );
}

export interface ProgressProps {
  /**
   * 0–100, or `null` for indeterminate.
   *
   * `null` rather than omitting the prop: "I do not know how far along this is" is a real state
   * that must be announced as such, and an optional prop makes it indistinguishable from a caller
   * who forgot to pass one.
   */
  value: number | null;
  /** Pre-translated, names the progress element. */
  label: string;
  /**
   * Pre-translated, e.g. "3 of 8 lessons". Becomes `aria-valuetext`.
   *
   * "47%" tells a screen-reader user the number and not the thing — the same reasoning as
   * `Slider`'s `aria-valuetext` at `PH-0.24`.
   */
  valueText?: string;
  /** Shows the numeric value beside the bar. */
  showValue?: boolean;
}

export function ProgressBar({ value, label, valueText, showValue = false }: ProgressProps) {
  const clamped = value === null ? null : Math.min(100, Math.max(0, value));

  return (
    <div className="flex flex-row items-center gap-3">
      <RadixProgress.Root
        value={clamped}
        max={100}
        aria-label={label}
        aria-valuetext={valueText}
        className="h-2 w-full overflow-hidden rounded-full bg-bg-inset"
      >
        <RadixProgress.Indicator
          className={`h-full bg-accent transition-transform duration-normal ease-standard ${
            clamped === null ? 'w-1/3 animate-pulse' : ''
          }`}
          style={clamped === null ? undefined : { width: `${String(clamped)}%` }}
        />
      </RadixProgress.Root>
      {showValue && clamped !== null ? (
        <Text size="xs" tone="secondary">
          <span className="tabular-nums">{valueText ?? `${String(Math.round(clamped))}%`}</span>
        </Text>
      ) : null}
    </div>
  );
}

export interface ProgressRingProps extends ProgressProps {
  /** Diameter in pixels. */
  size?: number;
}

/**
 * The same semantics in a circle, for the places a bar does not fit — a course card corner, a
 * lesson list row.
 *
 * Built from an SVG rather than Radix because Radix's `Progress` renders a div pair; the ARIA is
 * declared explicitly here instead, which is the only part that matters to a screen reader. The
 * geometry is arithmetic: circumference, then a dash offset.
 */
export function ProgressRing({
  value,
  label,
  valueText,
  showValue = false,
  size = 48,
}: ProgressRingProps) {
  const clamped = value === null ? null : Math.min(100, Math.max(0, value));
  const stroke = Math.max(3, Math.round(size / 12));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = clamped === null ? circumference * 0.75 : circumference * (1 - clamped / 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped ?? undefined}
      aria-valuetext={valueText}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/*
        `-rotate-90` starts the arc at the top rather than at three o'clock. NOT mirrored in RTL:
        a progress ring fills clockwise in every locale — it is a clock face, not a line of text
        (BR-1233, the same exemption brand marks and media controls take).
      */}
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true" focusable="false">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-bg-inset"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`stroke-accent transition-[stroke-dashoffset] duration-normal ease-standard ${
            clamped === null ? 'animate-spin' : ''
          }`}
        />
      </svg>
      {showValue && clamped !== null ? (
        <Text size="xs" tone="secondary">
          <span className="absolute inset-0 flex items-center justify-center tabular-nums">
            {String(Math.round(clamped))}
          </span>
        </Text>
      ) : null}
    </div>
  );
}
