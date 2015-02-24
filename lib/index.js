/**
* Module dependencies
*/
var Bower = require('./providers/bower');
var colors = require('colors/safe');

/**
 * Download module and its dependencies from different package managers
 * @param {String} manager Package manager name
 * @param {String} module Module name
 * @param {String} basePath Local repository directory
 * @param {Boolean} incDeps Should download module dependencies
 * @param {Boolean} incDevDeps Should download module dev dependencies
 * @param {Function} callback Callback function (err)
 */
var cloneModule = function (manager, module, basePath, incDeps, incDevDeps, callback) {
	var provider;
	switch (manager) {
		case 'bower':
			provider = new Bower(basePath, incDeps, incDevDeps);
			break;
	}
	if (!provider) {
		callback(new Error('this package manager is not supported!'));
	}
	else {
		provider.cloneModule(module, callback);
	}
};

exports.cloneModule = cloneModule;
