const js = require('@eslint/js');
const globals = require('globals');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
	{ files: ['**/*.{js,cjs}'], plugins: { js }, extends: ['js/recommended'] },
	{ files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
	{
		files: ['**/*.{js,cjs}'],
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
	},
	{ files: ['test/**/*.js'], languageOptions: { globals: globals.jest } },
]);
