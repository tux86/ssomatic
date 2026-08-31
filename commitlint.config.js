export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting, missing semicolons, etc.
        'refactor', // Code restructuring
        'perf',     // Performance improvement
        'test',     // Adding tests
        'build',    // Build system or dependencies
        'ci',       // CI configuration
        'chore',    // Maintenance tasks
        'revert',   // Revert a commit
      ],
    ],
    'scope-enum': [
      1,
      'always',
      [
        'main', // release-please's own commits: `chore(main): release X.Y.Z`
        'cli',
        'aws',
        'ci',
        'deps',
      ],
    ],
  },
};
