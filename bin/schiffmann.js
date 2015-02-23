#!/usr/bin/env node

var argv = require('optimist')
	.usage('Download bower module and its dependencies.\nUsage: $0')
	.demand('m')
	.alias('m', 'module')
	.describe('m', 'Bower module name')
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


require('../lib').cloneModule(argv.m, argv.p, argv.deps, argv.dev, function (err) {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	process.exit();
});
