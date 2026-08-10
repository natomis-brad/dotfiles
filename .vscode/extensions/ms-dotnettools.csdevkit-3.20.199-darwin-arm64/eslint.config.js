// @ts-check
const tseslint = require('typescript-eslint')
const eslintConfigPrettier = require('eslint-config-prettier')
const eslintPluginPrettier = require('eslint-plugin-prettier/recommended')

module.exports = tseslint.config(
	{
		ignores: ['out/**', 'dist/**', '**/*.d.ts', 'src/test/assets/**', 'ref/**', '.vscode-test/**', 'node_modules/**'],
	},
	eslintConfigPrettier,
	eslintPluginPrettier,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: 6,
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			'@typescript-eslint/naming-convention': 'warn',
			curly: 'warn',
			'object-curly-spacing': 'off',
			eqeqeq: 'warn',
			'no-throw-literal': 'error',
			'no-unexpected-multiline': 'error',
			'prettier/prettier': [
				'warn',
				{
					printWidth: 160,
					semi: false,
					singleQuote: true,
					trailingComma: 'all',
					useTabs: true,
					endOfLine: 'auto',
					arrowParens: 'avoid',
				},
			],
		},
	},
)
