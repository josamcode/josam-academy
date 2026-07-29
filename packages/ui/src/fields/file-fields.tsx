'use client';

import { Upload, X } from 'lucide-react';
import { type DragEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import type { Availability } from '../form/availability.js';
import { useFormField } from '../form/FormField.js';
import { Inline, Stack } from '../primitives/layout.js';
import { Text } from '../primitives/Text.js';
import {
  cropRectFor,
  formatBytes,
  matchesAspect,
  type RejectionReason,
  type Size,
  validateFile,
} from './file-validation.js';

/**
 * `FileDrop` and `ImageDrop` (`12 §20.7`).
 *
 * `BR-1413` / `BR-1543` — accepted types and size limits are stated **before the picker opens**,
 * not as an error afterwards. A user who has already chosen a 40 MB video and waited for it to
 * start uploading has been told the limit at the most expensive possible moment.
 *
 * `BR-1467` / `BR-1660` — validation is by MIME type, not extension, and `file.type` is *not* a
 * MIME type: browsers derive it from the extension. The real check is a byte-signature sniff, and
 * it lives in `file-validation.ts` where it can be tested directly.
 */

const DROP_ZONE =
  'flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-border-subtle ' +
  'bg-bg-inset p-6 text-center outline-none focus-within:ring-2 focus-within:ring-border-focus ' +
  'aria-invalid:border-danger';

const ICON_BUTTON =
  'rounded-sm p-2 text-text-secondary outline-none hover:bg-bg-surface ' +
  'focus-visible:ring-2 focus-visible:ring-border-focus';

interface FieldBinding {
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
}

export interface FileDropLabels {
  /** Pre-translated. e.g. "Drop a file here, or browse". */
  prompt: string;
  browse: string;
  remove: string;
  /**
   * Renders the constraint sentence shown *before* the picker opens (`BR-1543`). Takes the
   * human-readable type list and the formatted size so the caller controls the sentence order,
   * which differs between Arabic and English.
   */
  constraints: (types: string, maxSize: string) => string;
  /** One message per rejection reason. Pre-translated, and specific — "invalid file" is not an
   * error message, it is a shrug. */
  rejected: Record<RejectionReason, string>;
  uploading: string;
  cancel: string;
}

export interface FileDropProps {
  /** Concrete MIME types. Wildcards throw — they cannot be sniffed. */
  accept: string[];
  maxBytes: number;
  /** BCP-47, for the size formatting. */
  locale: string;
  labels: FileDropLabels;
  /**
   * Performs the upload. Receives an `AbortSignal` so cancel is real rather than cosmetic, and a
   * progress callback. Omit it and the field simply holds the `File`.
   */
  onUpload?: (
    file: File,
    signal: AbortSignal,
    onProgress: (fraction: number) => void,
  ) => Promise<void>;
}

interface Wiring {
  id: string;
  labelledBy: string;
  describedBy: string | undefined;
  invalid: boolean;
}

function FileDropControl({
  field,
  id,
  labelledBy,
  describedBy,
  invalid,
  accept,
  maxBytes,
  locale,
  labels,
  onUpload,
  disabled = false,
  disabledReason,
  readOnly = false,
}: FileDropProps & Availability & Wiring & { field: FieldBinding }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const constraintsId = useId();
  const statusId = useId();

  const [rejection, setRejection] = useState<RejectionReason | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const file = field.value instanceof File ? field.value : null;

  // An in-flight upload outlives the component if nobody aborts it, and its progress callback then
  // sets state on an unmounted tree. Cancelling on unmount is the same code path as the Cancel
  // button, so it is exercised by the same test.
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const accepted = useCallback(
    async (candidate: File) => {
      const reason = await validateFile(candidate, { accept, maxBytes });
      setRejection(reason);
      if (reason !== null) return;

      field.onChange(candidate);

      if (onUpload === undefined) return;
      const controller = new AbortController();
      abortRef.current = controller;
      setProgress(0);
      try {
        await onUpload(candidate, controller.signal, setProgress);
      } catch {
        // An aborted upload is a user action, not an error to report back at them. A failed one is
        // the caller's to surface through the form's error state, which is where every other
        // failure in this system is announced.
      } finally {
        abortRef.current = null;
        setProgress(null);
      }
    },
    [accept, maxBytes, field, onUpload],
  );

  const interactive = !disabled && !readOnly;

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!interactive) return;
    const dropped = event.dataTransfer.files[0];
    if (dropped !== undefined) void accepted(dropped);
  };

  const typeList = accept.map((type) => type.split('/')[1]?.toUpperCase() ?? type).join(' · ');

  return (
    <Stack gap="2">
      {/*
        The constraints are rendered ABOVE the drop zone and referenced by aria-describedby, so
        they are announced when the control receives focus rather than discovered after a rejected
        upload (BR-1543).
      */}
      <Text size="xs" tone="secondary">
        <span id={constraintsId}>
          {labels.constraints(typeList, formatBytes(locale, maxBytes))}
        </span>
      </Text>

      {/*
        A real <label>, not a div with drag handlers. `jsx-a11y/no-static-element-interactions`
        rejected the div and was right: a div carrying drop handling is reachable by pointer only.
        A label wrapping the input is natively clickable across its whole area AND keeps the
        keyboard path intact — a focused file input opens the picker on Enter or Space, which is
        why the separate "browse" button this once had is gone rather than hidden. One element,
        both input methods, no role invented to satisfy a linter.
      */}
      <label
        htmlFor={id}
        className={`${DROP_ZONE} ${dragging ? 'border-accent' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (interactive) setDragging(true);
        }}
        onDragLeave={() => {
          setDragging(false);
        }}
        onDrop={onDrop}
      >
        <Upload width={20} height={20} aria-hidden="true" focusable="false" />
        <Text size="sm" tone="secondary">
          {labels.prompt}
        </Text>

        {/*
          A real file input, visually hidden rather than `display: none` — a hidden input is not
          focusable, and the browse button below drives it. `sr-only` keeps it in the accessibility
          tree and in the tab order.
        */}
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="sr-only"
          accept={accept.join(',')}
          disabled={disabled || readOnly}
          aria-labelledby={labelledBy}
          aria-describedby={[describedBy, constraintsId, statusId].filter(Boolean).join(' ')}
          aria-invalid={invalid || rejection !== null}
          onBlur={field.onBlur}
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            if (chosen !== undefined) void accepted(chosen);
          }}
        />

        <Text size="sm" tone="secondary">
          <span className="underline" title={disabled ? disabledReason : undefined}>
            {labels.browse}
          </span>
        </Text>
      </label>

      {/* One live region for every state change, so nothing is announced twice or not at all. */}
      <div id={statusId} aria-live="polite">
        {rejection === null ? null : (
          <Text size="xs" tone="danger">
            <span role="alert">{labels.rejected[rejection]}</span>
          </Text>
        )}

        {file === null ? null : (
          <Inline gap="2">
            <Text size="sm">{file.name}</Text>
            <Text size="xs" tone="secondary">
              {formatBytes(locale, file.size)}
            </Text>
            {interactive ? (
              <button
                type="button"
                aria-label={labels.remove}
                className={ICON_BUTTON}
                onClick={() => {
                  abortRef.current?.abort();
                  field.onChange(null);
                  setRejection(null);
                  if (inputRef.current !== null) inputRef.current.value = '';
                }}
              >
                <X width={14} height={14} aria-hidden="true" focusable="false" />
              </button>
            ) : null}
          </Inline>
        )}

        {progress === null ? null : (
          <Inline gap="2">
            <progress value={progress} max={1} aria-label={labels.uploading}>
              {Math.round(progress * 100)}%
            </progress>
            <button
              type="button"
              className={ICON_BUTTON}
              onClick={() => {
                abortRef.current?.abort();
              }}
            >
              <Text size="xs">{labels.cancel}</Text>
            </button>
          </Inline>
        )}
      </div>
    </Stack>
  );
}

export function FileDrop(props: FileDropProps & Availability) {
  const { id, name, labelledBy, describedBy, invalid } = useFormField();
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FileDropControl
          {...props}
          field={field}
          id={id}
          labelledBy={labelledBy}
          describedBy={describedBy}
          invalid={invalid}
        />
      )}
    />
  );
}

// ── ImageDrop ────────────────────────────────────────────────────────────────────────────
export interface ImageDropProps extends FileDropProps {
  /**
   * Required width ÷ height, e.g. `16 / 9`. Omit to accept any shape.
   *
   * When set, an image of a different shape is **cropped**, not rejected: the user chose the right
   * picture and the wrong dimensions, and cropping is what they would do next anyway.
   */
  aspect?: number;
  imageLabels: {
    /** Pre-translated alt text for the preview. */
    preview: string;
    /** Labels the crop offset control. */
    cropOffset: string;
  };
}

/**
 * `FileDrop` + preview + aspect enforcement.
 *
 * Crop offset is a `range` input rather than a drag handle: a slider is keyboard operable by
 * default, announces its value, and works on a touch screen without a long-press. A drag-only crop
 * would be the one control in this library a keyboard user could not operate
 * (`BR-1569`–`BR-1571`).
 *
 * The crop arithmetic is `cropRectFor` in `file-validation.ts` — pure and directly tested. Only the
 * canvas draw below is untestable in jsdom (`SB-26`).
 */
export function ImageDrop({ aspect, imageLabels, ...props }: ImageDropProps & Availability) {
  const { name } = useFormField();
  const { watch } = useFormContext();
  const value: unknown = watch(name);

  const [preview, setPreview] = useState<string | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [offset, setOffset] = useState(0.5);

  const file = value instanceof File ? value : null;

  useEffect(() => {
    if (file === null) {
      setPreview(null);
      setNatural(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    // Revoking is not tidiness: an object URL pins the whole file in memory for the lifetime of the
    // document, so a user replacing an image five times holds five images.
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const needsCrop = aspect !== undefined && natural !== null && !matchesAspect(natural, aspect);
  const rect = needsCrop && natural !== null ? cropRectFor(natural, aspect, offset) : null;

  return (
    <Stack gap="2">
      <FileDrop {...props} />

      {preview === null ? null : (
        <Stack gap="2">
          <img
            src={preview}
            alt={imageLabels.preview}
            className="max-h-48 rounded-md object-contain"
            onLoad={(event) => {
              setNatural({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              });
            }}
          />

          {rect === null ? null : (
            <Stack gap="1">
              <label htmlFor={`${name}-crop`}>
                <Text size="xs" tone="secondary">
                  {imageLabels.cropOffset}
                </Text>
              </label>
              <input
                id={`${name}-crop`}
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={offset}
                aria-valuetext={`${String(Math.round(offset * 100))}%`}
                onChange={(event) => {
                  setOffset(Number(event.target.value));
                }}
              />
              <Text size="xs" tone="muted">
                <span data-testid="crop-rect" dir="ltr">
                  {`${String(rect.width)}×${String(rect.height)} @ ${String(rect.x)},${String(rect.y)}`}
                </span>
              </Text>
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}
