/**
 * Pre-commit checks. 13 §9: "Fast pre-commit checks only" — no build, no typecheck, no tests.
 * CI (PH-0.10) is what runs the full gate.
 */
export default {
  '*.{ts,tsx,mts,cts}': ['eslint --fix --max-warnings=0 --no-warn-ignored', 'prettier --write'],
  '*.{js,mjs,cjs}': ['eslint --fix --max-warnings=0 --no-warn-ignored', 'prettier --write'],
  // `--allow-empty-input`, same as the root `lint:css` script: a staged .css that
  // .stylelintignore excludes (docs/design-reference/) otherwise fails the whole hook with
  // AllFilesIgnoredError — the ignore doing its job read as an error.
  '*.css': ['stylelint --fix --allow-empty-input', 'prettier --write'],
  '*.{json,md,yaml,yml}': ['prettier --write'],
};
