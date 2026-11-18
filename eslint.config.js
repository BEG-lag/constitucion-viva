// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', '.cache/', 'data/'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.js'] },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true, ignoreVoidOperator: true }],
      'no-irregular-whitespace': 'error',
      // The em-dash is banned project-wide (house style of the author).
      'no-restricted-syntax': [
        'error',
        { selector: 'Literal[value=/\\u2014/]', message: 'Do not use the em-dash character.' },
        { selector: 'TemplateElement[value.raw=/\\u2014/]', message: 'Do not use the em-dash character.' },
      ],
    },
  },
  {
    files: ['eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
);
