import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Bidi, T } from './text.js';
import { Duration, Money, Num, Percent } from './format.js';
import { When } from './When.js';

const ARABIC_INDIC = /[٠-٩]/;

describe('T — bilingual field with Arabic fallback (BR-1109, BR-524)', () => {
  const value = { ar: 'أساسيات البرمجة', en: 'Programming Basics' };

  it('renders Arabic for ar', () => {
    expect(renderToStaticMarkup(<T value={value} locale="ar" />)).toContain('أساسيات البرمجة');
  });

  it('renders English for en', () => {
    expect(renderToStaticMarkup(<T value={value} locale="en" />)).toContain('Programming Basics');
  });

  it('falls back to Arabic when English is missing', () => {
    const arabicOnly = { ar: 'بدون ترجمة' };
    expect(renderToStaticMarkup(<T value={arabicOnly} locale="en" />)).toContain('بدون ترجمة');
  });

  it('marks the fallback with lang="ar" so it is not announced in an English voice', () => {
    const arabicOnly = { ar: 'بدون ترجمة' };
    expect(renderToStaticMarkup(<T value={arabicOnly} locale="en" />)).toContain('lang="ar"');
    // ...and does not mislabel a genuine English string.
    expect(renderToStaticMarkup(<T value={value} locale="en" />)).toContain('lang="en"');
  });

  it('has no reverse fallback — Arabic is the source of truth, never the gap', () => {
    // There is no way to express an English-only value: `ar` is required by the type.
    const arabicOnly = { ar: 'أ' };
    expect(renderToStaticMarkup(<T value={arabicOnly} locale="ar" />)).toContain('أ');
  });
});

describe('Bidi — Unicode isolation, not embedding (BR-1393, BR-1236)', () => {
  it('wraps the run in <bdi>, which isolates', () => {
    const markup = renderToStaticMarkup(<Bidi>example.com</Bidi>);
    expect(markup).toContain('<bdi');
    expect(markup).toContain('dir="ltr"');
  });

  it('keeps trailing punctuation on the correct side of an isolated Latin run', () => {
    // The defect this exists for: without isolation the full stop jumps in front of the domain
    // inside Arabic prose, which reads as a typo and so never gets reported as a bidi bug.
    const dom = new JSDOM(
      `<div dir="rtl">افتح ${renderToStaticMarkup(<Bidi>example.com</Bidi>)}.</div>`,
    );
    const bdi = dom.window.document.querySelector('bdi');
    expect(bdi?.textContent).toBe('example.com');
    // The isolate boundary is a real element, so the punctuation is outside it in the DOM.
    expect(dom.window.document.querySelector('div')?.textContent).toBe('افتح example.com.');
  });
});

describe('Money — minor units, explicit currency (BR-826, BR-1428)', () => {
  it('scales by the currency exponent, not by an assumed 100', () => {
    expect(renderToStaticMarkup(<Money amount={12345} currency="EGP" locale="en" />)).toContain(
      '123.45',
    );
    expect(renderToStaticMarkup(<Money amount={12345} currency="JOD" locale="en" />)).toContain(
      '12.345',
    );
    expect(renderToStaticMarkup(<Money amount={12345} currency="JPY" locale="en" />)).toContain(
      '12,345',
    );
  });

  it('uses Western digits in Arabic (BR-1226)', () => {
    expect(renderToStaticMarkup(<Money amount={12345} currency="EGP" locale="ar" />)).not.toMatch(
      ARABIC_INDIC,
    );
  });

  it('uses tabular figures and stays LTR so columns align (BR-1341)', () => {
    const markup = renderToStaticMarkup(<Money amount={100} currency="EGP" locale="ar" />);
    expect(markup).toContain('tabular-nums');
    expect(markup).toContain('dir="ltr"');
  });
});

describe('Num and Percent', () => {
  it('formats numbers per locale with Western digits', () => {
    expect(renderToStaticMarkup(<Num value={1234.5} locale="ar" />)).not.toMatch(ARABIC_INDIC);
    expect(renderToStaticMarkup(<Num value={1234} locale="en" />)).toContain('1,234');
  });

  it('takes a fraction, not a pre-multiplied number', () => {
    expect(renderToStaticMarkup(<Percent fraction={0.35} locale="en" />)).toContain('35%');
  });

  it('renders Arabic percentages with Western digits', () => {
    expect(renderToStaticMarkup(<Percent fraction={0.35} locale="ar" />)).not.toMatch(ARABIC_INDIC);
  });
});

describe('Duration — mm:ss, always LTR (BR-1234)', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [65, '1:05'],
    [725, '12:05'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(renderToStaticMarkup(<Duration seconds={seconds} />)).toContain(expected);
  });

  it('stays LTR — mirroring 12:05 would render 05:12, a different time', () => {
    expect(renderToStaticMarkup(<Duration seconds={725} />)).toContain('dir="ltr"');
  });

  it('emits a machine-readable duration', () => {
    expect(renderToStaticMarkup(<Duration seconds={725} />)).toContain('dateTime="PT725S"');
  });

  it('clamps a negative value rather than rendering a negative clock', () => {
    expect(renderToStaticMarkup(<Duration seconds={-30} />)).toContain('0:00');
  });
});

describe('When — the learner’s timezone (BR-825)', () => {
  const at = new Date('2026-07-29T21:30:00Z');

  it('renders the same instant as a different DATE on either side of the line', () => {
    // 21:30 UTC is already the 30th in Cairo (UTC+3) and still the 29th in Los Angeles (UTC-7).
    // Cairo and Tokyo would BOTH show the 30th — the first version of this test used that pair
    // and passed for the wrong reason until the dates were actually computed.
    const cairo = renderToStaticMarkup(<When at={at} timeZone="Africa/Cairo" locale="en" />);
    const la = renderToStaticMarkup(<When at={at} timeZone="America/Los_Angeles" locale="en" />);

    expect(cairo).toContain('Jul 30, 2026');
    expect(la).toContain('Jul 29, 2026');
  });

  it('renders the same instant at a different clock time per timezone', () => {
    const cairo = renderToStaticMarkup(
      <When at={at} timeZone="Africa/Cairo" locale="en" format="time" />,
    );
    const tokyo = renderToStaticMarkup(
      <When at={at} timeZone="Asia/Tokyo" locale="en" format="time" />,
    );
    expect(cairo).not.toBe(tokyo);
  });

  it('always emits the UTC instant as the machine-readable value', () => {
    const markup = renderToStaticMarkup(<When at={at} timeZone="Africa/Cairo" locale="ar" />);
    expect(markup).toContain('dateTime="2026-07-29T21:30:00.000Z"');
  });

  it('formats relative time from an injected anchor, so it is deterministic', () => {
    const now = new Date('2026-07-29T21:30:00Z');
    const inThreeDays = new Date('2026-08-01T21:30:00Z');
    const markup = renderToStaticMarkup(
      <When at={inThreeDays} timeZone="Africa/Cairo" locale="en" format="relative" now={now} />,
    );
    expect(markup).toContain('in 3 days');
  });

  it('renders Arabic dates with Western digits (BR-1226)', () => {
    expect(
      renderToStaticMarkup(<When at={at} timeZone="Africa/Cairo" locale="ar" format="datetime" />),
    ).not.toMatch(ARABIC_INDIC);
  });
});
