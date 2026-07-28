import type { Catalog } from '../message.js';

/**
 * Arabic — the source of truth (`BR-524`, `PRIN-07`). Authored first; English is translated
 * from it, never the reverse.
 *
 * This object defines `MessageKey`, which is how `BR-524`'s "a missing Arabic string is a
 * build-time failure" is actually enforced: a key absent here does not exist as a type, so
 * `t('some.key')` referencing it does not compile. There is no runtime check to forget.
 *
 * Keys are namespaced by domain (`FEAT-184`: `course.enroll.button`). Phase 0 seeds only
 * infrastructure strings — the error envelope from `11 §1.5` and the form-validation messages
 * the Wave-1 field components need. Domain copy arrives with the features that own it.
 */
export const ar = {
  'common.retry': 'إعادة المحاولة',
  'common.cancel': 'إلغاء',
  'common.save': 'حفظ',
  'common.close': 'إغلاق',
  'common.loading': 'جارٍ التحميل…',

  // The 11 §1.5 error envelope. BR-1113 needs these server-side; PH-0.19 currently emits a
  // single English string and is waiting on this catalog.
  'error.internal': 'حدث خطأ من جانبنا. حاول مرة أخرى بعد قليل.',
  'error.notFound': 'لم نعثر على ما تبحث عنه.',
  'error.unauthenticated': 'انتهت جلستك. سجّل الدخول من جديد.',
  'error.forbidden': 'ليس لديك صلاحية للوصول إلى هذا.',
  'error.validation': 'تحقّق من البيانات المدخلة.',
  'error.rateLimited': 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.',
  'error.offline': 'لا يوجد اتصال بالإنترنت.',

  // Interpolation with named variables — never concatenation (BR-1399).
  'greeting.welcome': 'أهلاً {name}',

  /**
   * All six CLDR forms (`BR-525`). Arabic distinguishes 0, 1, 2, 3–10, 11–99, and 100+ —
   * verified against Intl.PluralRules('ar'), which reaches every one of them.
   */
  'validation.minLength': {
    zero: 'أدخل حرفاً واحداً على الأقل',
    one: 'أدخل حرفاً واحداً على الأقل',
    two: 'أدخل حرفين على الأقل',
    few: 'أدخل {count} أحرف على الأقل',
    many: 'أدخل {count} حرفاً على الأقل',
    other: 'أدخل {count} حرف على الأقل',
  },

  'selection.count': {
    zero: 'لم يتم تحديد أي عنصر',
    one: 'تم تحديد عنصر واحد',
    two: 'تم تحديد عنصرين',
    few: 'تم تحديد {count} عناصر',
    many: 'تم تحديد {count} عنصراً',
    other: 'تم تحديد {count} عنصر',
  },
} as const satisfies Catalog;

/**
 * The key space, derived from Arabic. This is what makes `BR-524` a compile-time rule: a key not
 * present above is not assignable here, so no call site can reference it.
 */
export type MessageKey = keyof typeof ar;
