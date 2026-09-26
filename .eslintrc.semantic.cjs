module.exports = {
  root: true,
  env: {
    es2023: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist', 'node_modules', 'legado'],
  rules: {
    'no-debugger': 'error',
    'no-unreachable': 'error',
    'no-unsafe-finally': 'error',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
