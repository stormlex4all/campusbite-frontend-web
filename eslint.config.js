// npm install --save-dev eslint @eslint/js eslint-plugin-jest globals
//npm install --save-dev @types/jest @types/supertest

const js = require("@eslint/js");
const jest = require("eslint-plugin-jest");
const globals = require("globals");

module.exports = [
	js.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		files: ["**/*.test.js", "**/*.spec.js", "**/__tests__/**/*.js"],
		...jest.configs["flat/recommended"],
		rules: {
			...jest.configs["flat/recommended"].rules,
			...jest.configs["flat/style"].rules,
			// Supertest uses .expect() chains that eslint-plugin-jest might mistake for missing assertions
			"jest/expect-expect": [
				"warn",
				{
					assertFunctionNames: ["expect", "request.**.expect"],
				},
			],
		},
	},
];
