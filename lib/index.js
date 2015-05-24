/**
 * Module dependencies
 */
var Bower = require('./providers/bower');
var Npm = require('./providers/npm');
var colors = require('colors/safe');

/**
 * Download module and its dependencies from different package managers
 * @param {Object} options:
 *		manager: Package manager name
 *		module: module Module name
 *		package: package file path
 *		version: Version string
 *		basePath: Local repository directory
 *		incDeps: Should download module dependencies
 *		incDevDeps: Should download module dev dependencies
 * @param {Function} callback Callback function (err)
 */
var cloneModule = function (options, callback) {
	var provider, module, package, manager = options.manager, ver = options.version,
	 basePath = options.basePath, incDeps = options.incDeps, incDevDeps = options.incDevDeps;

	switch (manager) {
		case 'bower':
			provider = new Bower(basePath, incDeps, incDevDeps);
			break;
		case 'npm':
			provider = new Npm(basePath, incDeps, incDevDeps);
			break;
	}
	if (!provider) {
		callback(new Error('this package manager is not supported!'));
	}
	else {
		if(options.module)
			provider.cloneModule(options.module, ver, callback);
		else if(options.package)
			provider.clonePackageFile(options.package, callback)
	}
};

exports.cloneModule = cloneModule;
