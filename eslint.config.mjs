// @ts-check

import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: [
      '**/*.test.ts',
      '**/*.spec.ts',
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'coverage/**',
      'prisma/generated/**',
    ]
  }
);