#!/usr/bin/env node

var colors = require('colors/safe');
var argv = require('optimist')
	.usage('Download module and its dependencies from different package managers.\nUsage: $0')
	.demand('pm')
	.alias('pm', 'packageManager')
	.describe('m', 'Package manager name')
	.demand('m')
	.alias('m', 'module')
	.describe('m', 'Module name')
	.demand('p')
	.alias('p', 'path')
	.describe('p', 'Local repository directory')
	.boolean('deps')
	.default('deps', true)
	.describe('deps', 'Should download module dependencies')
	.boolean('dev')
	.default('dev', false)
	.describe('dev', 'Should download module dev dependencies')
	.argv;


require('../lib').cloneModule(argv.pm, argv.m, argv.p, argv.deps, argv.dev, function (err) {
	if (err) {
		console.error(colors.red(err.message));
		process.exit(1);
	}
	process.exit();
});
