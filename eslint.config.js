import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'client/public/**',
      'data/**',
      'uploads/**',
      'backups/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['scripts/**/*.{js,mjs}', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        __APP_VERSION__: 'readonly',
        __BUILD_TIME__: 'readonly',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
  },
  prettier,
)
