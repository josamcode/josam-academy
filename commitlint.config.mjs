/**
 * Commit message rules.
 *
 * CLAUDE.md §2 step 6 mandates `<type>(PH-0.x): <what>`. Nothing enforced it, and 191 tasks is
 * long enough for the format to drift — so the scope, when present, must be a real task id.
 *
 * A scope is not required: documentation corrections and repository chores are legitimately
 * task-less. What is rejected is a scope that *looks* like a task id but is not one
 * (`ph0.3`, `phase-0.3`, `PH0.3`), because that is how a task's history becomes ungreppable.
 */
const TASK_SCOPE = /^PH-\d+\.\d+$/;

export default {
  extends: ['@commitlint/config-conventional'],

  plugins: [
    {
      rules: {
        'scope-task-id': ({ scope }) => {
          if (!scope) return [true];
          return [
            TASK_SCOPE.test(scope),
            `scope must be a task id such as PH-0.3, or be omitted entirely — received "${scope}"`,
          ];
        },
      },
    },
  ],

  rules: {
    // Task ids are upper-case by definition, so the default lower-case check cannot apply.
    'scope-case': [0],
    'scope-task-id': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
  },
};
