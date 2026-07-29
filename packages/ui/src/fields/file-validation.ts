/**
 * File validation and crop arithmetic for `FileDrop` and `ImageDrop`, kept free of React so the
 * parts that actually decide whether an upload is accepted can be tested directly.
 *
 * `BR-1467` / `BR-1660` — uploads are validated by **MIME type**, not by extension. That
 * distinction is the whole point of the rule, and it is easy to satisfy on paper while missing it
 * in practice, because `File.type` is *not* a sniffed MIME type: browsers derive it from the file
 * extension and the OS registry. Renaming `payload.exe` to `photo.png` produces a `File` whose
 * `.type` reads `image/png`. Checking `file.type` alone is therefore an extension check wearing a
 * MIME type's clothes.
 *
 * `sniffMimeType` reads the leading bytes and matches them against real format signatures, which
 * is what `BR-1660` asks for. It is a client-side check: it improves the error the user sees and
 * catches honest mistakes, and it is **not** a security boundary — the server re-sniffs every
 * upload (`14 §BR-1660`). Anything reachable from the client can be lied to.
 */

export interface FileSignature {
  mime: string;
  /** Byte prefix. `null` matches any byte at that position. */
  bytes: (number | null)[];
  offset?: number;
}

/**
 * Signatures for the types this product actually accepts. Deliberately short: a signature for a
 * format nothing accepts is code that can only ever be wrong.
 */
export const FILE_SIGNATURES: FileSignature[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  // RIFF....WEBP — the four length bytes in between are content, so they match anything.
  {
    mime: 'image/webp',
    bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
  },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
];

const LONGEST_SIGNATURE = FILE_SIGNATURES.reduce(
  (max, signature) => Math.max(max, (signature.offset ?? 0) + signature.bytes.length),
  0,
);

/** The sniffed MIME type, or `null` when the leading bytes match no known signature. */
export async function sniffMimeType(blob: Blob): Promise<string | null> {
  const head = new Uint8Array(await blob.slice(0, LONGEST_SIGNATURE).arrayBuffer());

  for (const signature of FILE_SIGNATURES) {
    const offset = signature.offset ?? 0;
    if (head.length < offset + signature.bytes.length) continue;

    const matches = signature.bytes.every(
      (byte, index) => byte === null || head[offset + index] === byte,
    );
    if (matches) return signature.mime;
  }
  return null;
}

export type RejectionReason = 'type' | 'size' | 'mismatch' | 'aspect';

export interface FileRejection {
  file: File;
  reason: RejectionReason;
}

export interface AcceptCriteria {
  /** Concrete MIME types. Wildcards are not accepted — see the note in `validateFile`. */
  accept: string[];
  maxBytes: number;
}

/**
 * `accept` holds concrete MIME types only, never `image/*`.
 *
 * A wildcard cannot be sniffed: the whole mechanism is "does the byte signature equal a type we
 * named", and `image/*` names no type. Accepting wildcards here would mean silently skipping the
 * signature check for exactly the fields most likely to receive a hostile file, while the
 * configuration still looked strict.
 */
export async function validateFile(
  file: File,
  { accept, maxBytes }: AcceptCriteria,
): Promise<RejectionReason | null> {
  if (accept.some((type) => type.endsWith('/*'))) {
    throw new Error(
      `accept must list concrete MIME types; "${accept.join(', ')}" contains a wildcard, which ` +
        'cannot be checked against a byte signature (BR-1467).',
    );
  }

  // Size first: it is free, and reading the head of a 900 MB file to reject it for being 900 MB
  // is work done purely to arrive at the same answer.
  if (file.size > maxBytes) return 'size';
  if (!accept.includes(file.type)) return 'type';

  const sniffed = await sniffMimeType(file);
  const declaredIsKnown = FILE_SIGNATURES.some((signature) => signature.mime === file.type);

  // Two distinct rejections, and getting this wrong once already defeated the whole rule.
  //
  // The first version treated an unrecognised signature as acceptable, reasoning that formats
  // absent from the table should not be rejected. That is true for `text/csv` — and it also let
  // through a PE executable renamed `photo.png`, because `MZ` matches no signature. The disguise
  // case is the entire reason `BR-1467` exists, and the lenient rule was blind to exactly it.
  //
  // The question is not "did we recognise these bytes" but "do we know what the DECLARED type is
  // supposed to look like":
  //   - we know PNG, and these bytes are not PNG   -> mismatch, whatever they actually are
  //   - we do not know CSV, so we cannot check it  -> accept, the declared type was allowed
  if (declaredIsKnown && sniffed !== file.type) return 'mismatch';
  if (!declaredIsKnown && sniffed !== null && sniffed !== file.type) return 'mismatch';

  return null;
}

/** `1.5 MB`, `900 KB`. Locale-aware because it is user-facing (`BR-526`). */
export function formatBytes(locale: string, bytes: number): string {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: units[unit],
    unitDisplay: 'short',
    maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0,
  }).format(value);
}

export interface Size {
  width: number;
  height: number;
}

export interface CropRect extends Size {
  x: number;
  y: number;
}

/**
 * The largest rectangle of the target aspect ratio that fits inside `natural`, positioned along
 * the overflowing axis by `offset` (0 = start/top, 0.5 = centred, 1 = end/bottom).
 *
 * Pure, so the arithmetic is testable. The canvas draw that consumes it is three lines and is the
 * only part that cannot run in jsdom (`SB-26`).
 */
export function cropRectFor(natural: Size, aspect: number, offset = 0.5): CropRect {
  const clamped = Math.min(1, Math.max(0, offset));
  const naturalAspect = natural.width / natural.height;

  if (naturalAspect > aspect) {
    // Too wide: full height, crop the sides.
    const width = Math.round(natural.height * aspect);
    return {
      x: Math.round((natural.width - width) * clamped),
      y: 0,
      width,
      height: natural.height,
    };
  }
  // Too tall (or exact): full width, crop top and bottom.
  const height = Math.round(natural.width / aspect);
  return { x: 0, y: Math.round((natural.height - height) * clamped), width: natural.width, height };
}

/**
 * Whether an image already satisfies the required aspect ratio within `tolerance`.
 *
 * The tolerance exists because a 1600×900 image is 16:9 and a 1601×900 image is not, and rejecting
 * the second one teaches the user nothing they can act on.
 */
export function matchesAspect(natural: Size, aspect: number, tolerance = 0.01): boolean {
  return Math.abs(natural.width / natural.height - aspect) <= tolerance;
}
