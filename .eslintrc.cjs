module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
  overrides: [
    {
      // the backend runs in Node, not the browser — it has no JSX/React
      // and needs Node globals (process, console, __dirname via import.meta, etc.)
      files: ['server/**/*.js', 'api/**/*.js'],
      env: { browser: false, node: true, es2020: true },
      extends: ['eslint:recommended'],
      rules: {
        'react-refresh/only-export-components': 'off',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      },
    },
  ],
}
