// @see docs/02_QUALITY_STANDARDS.md §2 — ESLint config
// This must be kept in sync with CI (.github/workflows/ci.yml)

module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: ['./packages/*/tsconfig.json'],
        tsconfigRootDir: __dirname,
    },
    plugins: ['@typescript-eslint', 'import'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:import/typescript',
    ],
    rules: {
        // Absolute bans per .cursorrules
        'no-console': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        'no-var': 'error',

        // Async safety
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',

        // Code quality
        '@typescript-eslint/prefer-nullish-coalescing': 'warn',
        '@typescript-eslint/prefer-optional-chain': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

        // Import order
        'import/order': ['warn', {
            groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
            'newlines-between': 'always',
            alphabetize: { order: 'asc' },
        }],
    },
    overrides: [
        {
            // React (web package)
            files: ['packages/web/**/*.{ts,tsx}'],
            plugins: ['react-hooks'],
            rules: {
                'react-hooks/rules-of-hooks': 'error',
                'react-hooks/exhaustive-deps': 'warn',
                'no-console': 'error',
            },
        },
        {
            // Test files — relax some rules
            files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx'],
            rules: {
                '@typescript-eslint/no-unsafe-assignment': 'off',
                '@typescript-eslint/no-unsafe-member-access': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
            },
        },
    ],
    ignorePatterns: ['**/dist/**', '**/node_modules/**', '**/*.js'],
};
