// eslint.config.js
import eslintRecommended from 'eslint/use-at-your-own-risk/recommended.js';
import globals from 'globals';

export default [
	eslintRecommended,
	{
		files: ['**/*.js'],
		languageOptions: {
			ecmaVersion: 2021,
			sourceType: 'script',
			globals: globals.node,
		},
		rules: {
			// custom rules here
		},
	},
];
