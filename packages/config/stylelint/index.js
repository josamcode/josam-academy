/**
 * Shared Stylelint configuration (13 §9).
 *
 * This is the baseline only. The rules that make Stylelint matter here — no raw hex in a
 * component (BR-1220), no Tailwind palette utilities (BR-1342), logical properties only
 * (BR-1232) — are fitness functions and are written at PH-0.16, where BR-1725 requires each
 * one to be proven by a deliberate violation that fails the build.
 *
 * @type {import("stylelint").Config}
 */
export default {
  extends: ['stylelint-config-standard'],
  rules: {},
};
