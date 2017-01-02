/**
 * Module dependencies
 */
var Npm = require('./providers/npm'); //gg
var async = require('async');

/**
 * Download module and its dependencies from different package managers
 * @param {Object} options:
 *		packageManager: Package manager name
 *		module: Module name
 *		version: Version string
 *		basePath: Local or in-memory repository directory
 *		incDeps: Should download module dependencies
 *		incDevDeps: Should download module dev dependencies
 * @param {Object} fileSystem: Either fs or fs-compatible Object
 * @param {Object} result:
 *      stream: (socket.io-stream).createStream() object
 *      size: Length of above stream
 * @param {Function} cbUpdate Callback function (typeOfUpdate, content)
 */
var cloneModule = function (options, fileSystem, streamToWriteTo, cbUpdate) {
    var packageManager = options.packageManager,
        ver = options.version,
	    basePath = options.basePath,
        incDeps = options.incDeps,
        incDevDeps = options.incDevDeps;
    var provider;

	switch (packageManager) {
		case 'npm':
			provider = new Npm(basePath, fileSystem, incDeps, incDevDeps, cbUpdate);
			break;
	}
	if (!provider) {
		cbUpdate('criticalError',{message: 'this package manager is not supported!'});
	} else {
		async.waterfall([
			function (callback) {
				provider.cloneModule(options.module, ver, callback);
			},
			function (callback) {
				provider.getDownloadStreamFromBasePath(streamToWriteTo, callback);
			},
		], function (error) {
				cbUpdate('criticalError',{message: 'something wrong happend!! ' + error.toString()});
		});
	}
};

exports.cloneModule = cloneModule;