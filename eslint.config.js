import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/data/**',
      'prototypes/**',
      'source-artifacts/**',
      'tests/artifacts/**'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.es2024,
        structuredClone: 'readonly'
      }
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error'
    }
  },
  {
    files: ['packages/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.es2024,
        structuredClone: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        crypto: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly'
      }
    },
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'Shared packages must not depend on browser window API.' },
        { name: 'document', message: 'Shared packages must not depend on browser document API.' },
        { name: 'localStorage', message: 'Shared packages must not depend on localStorage.' },
        { name: 'sessionStorage', message: 'Shared packages must not depend on sessionStorage.' },
        { name: 'navigator', message: 'Shared packages must not depend on browser navigator.' }
      ]
    }
  },
  {
    files: ['apps/web/src/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: [
      'apps/web/src/features/**/*.{js,jsx}',
      'apps/web/src/shared/**/*.{js,jsx}',
      'apps/web/src/app/**/*.{js,jsx}'
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'UI components must use @edumotion/services facade, never direct fetch.' },
        { name: 'XMLHttpRequest', message: 'UI components must not call XMLHttpRequest directly.' }
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/\\/api\\/v1/]',
          message: 'Do not hard-code /api/v1 endpoints inside UI components.'
        }
      ]
    }
  },
  {
    files: ['apps/mobile/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.es2024,
        structuredClone: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        process: 'readonly'
      }
    },
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'Mobile app source must remain React Native compatible without window.' },
        { name: 'document', message: 'Mobile app source must remain React Native compatible without document.' },
        { name: 'localStorage', message: 'Mobile app source must use SecureStore, never localStorage.' },
        { name: 'sessionStorage', message: 'Mobile app source must not use sessionStorage.' },
        { name: 'fetch', message: 'Mobile UI must call @edumotion/services facade, never direct fetch.' },
        { name: 'XMLHttpRequest', message: 'Mobile UI must not call XMLHttpRequest.' }
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/\\/api\\/v1/]',
          message: 'Do not hard-code /api/v1 endpoints inside Mobile UI.'
        }
      ]
    }
  },
  {
    files: ['apps/mobile/src/main.preview.jsx', 'apps/mobile/vite.mobile.config.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-restricted-globals': 'off'
    }
  },
  {
    files: ['apps/api/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2024,
        structuredClone: 'readonly'
      }
    }
  },
  {
    files: ['tests/**/*.js', 'tests/**/*.jsx', '*.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    }
  }
];
