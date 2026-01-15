// @ts-check
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.eslintrc.cjs'],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        jsxPragma: null, // for React 17+ JSX transform
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
        React: 'readonly', // React 19 auto-import
        RequestInit: 'readonly', // TypeScript/Fetch API global
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Relax some strict rules for MVP
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_|^e$',
        varsIgnorePattern: '^_',
      }],
      // Relax React hooks rules for MVP
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      // Allow lexical declarations in case blocks
      'no-case-declarations': 'warn',
      // Relax no-undef for TypeScript files (TypeScript handles this)
      'no-undef': 'off',
      // Allow redeclare warnings
      'no-redeclare': 'warn',
      // Relax control regex
      'no-control-regex': 'warn',
    },
  },
  {
    files: ['vite.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];


