module.exports = {
  root: true,
  env: {
    browser: true,
    es2024: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react-hooks'],
  extends: ['eslint:recommended'],
  rules: {
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'no-unused-vars': ['warn', {
      varsIgnorePattern: '^_',
      argsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    }],
    'no-undef': 'error',
  },
};
