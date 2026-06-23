const allowedTypes = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
  'impl',
];

const releaseRelevantTypes = ['feat', 'fix', 'perf', 'refactor', 'impl', 'build'];

const allowedScopes = [
  'adapters',
  'agents',
  'alert',
  'apps',
  'arango',
  'bigquery',
  'brokers',
  'cacher',
  'common',
  'core',
  'cron',
  'databases',
  'deps',
  'docs',
  'elastic',
  'file',
  'firebase',
  'gateway',
  'gpt',
  'http',
  'integrations',
  'kafka',
  'mailer',
  'micro',
  'mongo',
  'mysql',
  'notifier',
  'rabbit',
  'redcast',
  'release',
  'repo',
  'sqs',
  'storage',
  'tools',
  'types',
  'utils',
];

const genericSubjects = [
  'bug',
  'change',
  'changes',
  'fix',
  'fix bug',
  'implement',
  'init',
  'refactor',
  'update',
  'update dep',
  'update deps',
  'update dependencies',
  'update dependency',
  'update package',
  'update packages',
  'upgrade',
  'upgrade dep',
  'upgrade deps',
  'upgrade package',
  'upgrade packages',
];

const scopeChoices = allowedScopes.map(scope => ({ name: scope, value: scope }));

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
    'header-max-length': [2, 'always', 120],
    'scope-enum': [2, 'always', allowedScopes],
    'subject-case': [2, 'always', ['sentence-case', 'start-case', 'pascal-case', 'upper-case', 'lower-case']],
    'type-enum': [2, 'always', allowedTypes],
    'joktec-release-scope-required': [2, 'always'],
    'joktec-subject-not-generic': [2, 'always'],
  },
  plugins: [
    {
      rules: {
        'joktec-release-scope-required': parsed => {
          if (!releaseRelevantTypes.includes(parsed.type)) {
            return [true];
          }

          return [
            Boolean(parsed.scope),
            `scope is required for release-relevant commits: ${releaseRelevantTypes.join(', ')}`,
          ];
        },
        'joktec-subject-not-generic': parsed => {
          const subject = String(parsed.subject || '')
            .trim()
            .toLowerCase();

          return [
            !genericSubjects.includes(subject),
            'subject is too generic; describe the concrete package, runtime, API, dependency, or documentation impact',
          ];
        },
      },
    },
  ],
  prompt: {
    useEmoji: false,
    allowCustomScopes: false,
    allowEmptyScopes: false,
    allowBreakingChanges: ['feat', 'fix', 'perf', 'refactor'],
    types: [
      { value: 'feat', name: 'feat:     new public package, runtime, API, or framework capability' },
      { value: 'fix', name: 'fix:      bug fix with package/runtime/API impact' },
      { value: 'perf', name: 'perf:     performance improvement' },
      { value: 'refactor', name: 'refactor: internal restructuring without public behavior change' },
      { value: 'impl', name: 'impl:     implementation work that is not public release note material' },
      { value: 'build', name: 'build:    dependency, package manager, or build system change' },
      { value: 'docs', name: 'docs:     documentation-only change' },
      { value: 'test', name: 'test:     test-only change' },
      { value: 'ci', name: 'ci:       CI, hooks, or release automation change' },
      { value: 'chore', name: 'chore:    maintenance that has no package release impact' },
      { value: 'style', name: 'style:    formatting-only change' },
      { value: 'revert', name: 'revert:   revert a previous change' },
    ],
    scopes: scopeChoices,
    messages: {
      type: 'Select the change type:',
      scope: 'Select the package, package family, app, or repo scope:',
      subject: 'Write a specific release-quality subject:',
      body: 'Add details when the impact is not obvious:',
      breaking: 'Describe breaking changes:',
      footerPrefixsSelect: 'Select linked issue prefix:',
      customFooterPrefixs: 'Enter issue prefix:',
      footer: 'List linked issues:',
      confirmCommit: 'Commit with this message?',
    },
  },
};
