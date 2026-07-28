/**
 * Pre-commit checks. 13 §9: "Fast pre-commit checks only" — no build, no typecheck, no tests.
 * CI (PH-0.10) is what runs the full gate.
 */
export default {
  '*.{ts,tsx,mts,cts}': ['eslint --fix --max-warnings=0 --no-warn-ignored', 'prettier --write'],
  '*.{js,mjs,cjs}': ['eslint --fix --max-warnings=0 --no-warn-ignored', 'prettier --write'],
  '*.css': ['stylelint --fix', 'prettier --write'],
  '*.{json,md,yaml,yml}': ['prettier --write'],
};
