#!/usr/bin/env node

var colors = require('colors/safe');
var argv = require('optimist')
	.usage('Download module and its dependencies from different package managers.\nUsage: $0')
	.demand('pm')
	.alias('pm', 'packageManager')
	.describe('pm', 'Package manager name')
	.alias('m', 'module')
	.describe('m', 'Module name')
	.alias('pkg', 'package')
	.describe('pkg', 'Package file path')
	.demand('p')
	.alias('p', 'path')
	.describe('p', 'Local repository directory')
	.alias('v', 'version')
	.describe('v', 'Module version')
	.boolean('deps')
	.default('deps', true)
	.describe('deps', 'Should download module dependencies')
	.boolean('dev')
	.default('dev', false)
	.describe('dev', 'Should download module dev dependencies')
	.check(function(args){
		if(args.m === undefined && args.pkg === undefined){
			throw 'module (-m) or package file (--pkg) must be supplied';
		}

		if(args.m !== undefined && args.pkg !== undefined){
			throw 'only one of module (-m) or package file (--pkg) must be supplied';
		}
	})
	.argv;

var options = {
	manager: argv.pm,
	basePath: argv.p,
	incDeps: argv.deps,
	incDevDeps: argv.dev
};

if(argv.v){
	options.version = argv.v;
}

if(argv.m){
	options.module = argv.m;
}

if(argv.pkg){
	options.package = argv.pkg;
}

require('../lib').cloneModule(options, function (err) {
	if (err) {
		console.error(colors.red(err.message));
		process.exit(1);
	}
	process.exit();
});
