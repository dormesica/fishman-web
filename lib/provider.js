/**
 * Module dependencies
 */
var fs = require('fs');
var path = require('path');
var async = require('async');
var colors = require('colors/safe');

/**
 * Create a new Provider object
 * @abstract
 * @class Provider Base class for package manager providers
 * @param {String} basePath Local repository directory
 * @param {Boolean} incDeps Should download module dependencies
 * @param {Boolean} incDevDeps Should download module dev dependencies
 */
var Provider = function (basePath, incDeps, incDevDeps) {
	this.basePath = basePath;
	this.incDeps = incDeps;
	this.incDevDeps = incDevDeps;
};

/**
 * Read the package metadata
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {Function} callback Callback function (err, package)
 */
Provider.prototype.readPackage = function (module, ver, callback) {
	var self = this;
    var packagePath = this.getPackagePath(module, ver);
	var packageJson;
	fs.exists(packagePath, function (exists) {
		if (exists) {
			packageJson = require(packagePath);
		}
		if (!packageJson) {
			console.warn(colors.yellow('package file couldn\'t be found for module ' + module));
		}
		callback(null, packageJson);
	});
};

/**
* Return path to the package file
* @param {String} module Module name
* @param {String} ver Version string
* @return {String} path to the package file
*/
Provider.prototype.getPackagePath = function (module, ver) {
	throw new Error('Abstract method!');
};

/**
* Check if the module already exists
* @param {String} module Module name
* @param {String} ver Version string
* @return {Boolean} True, if the module exists
*/
Provider.prototype.isModuleExist = function (module, ver) {
	throw new Error('Abstract method!');
};

/**
 * Download a single module to local repository
 * @abstract
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {Function} callback Callback function (err, ver)
 */
Provider.prototype.cloneSingleModule = function (module, ver, callback) {
	callback(new Error('Abstract method!'));
};

/**
 * Download module to local repository
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {Function} callback Callback function (err)
 */
Provider.prototype.cloneModule = function (module, ver, callback) {
	var self = this;
	var package;

	async.waterfall([
		function (callback) {
			self.cloneSingleModule(module, ver, callback);
		},
		function (ver, callback) {
			console.info(colors.green('done cloning ' + module));
			self.readPackage(module, ver, callback);
		},
		function (_package, callback) {
			package = _package;
			if (self.incDeps && package && package.dependencies) {
				self.cloneDeps(package.dependencies, callback);
			}
			else {
				callback();
			}
		},
		function (callback) {
			if (self.incDevDeps && package && package.devDependencies) {
				self.cloneDeps(package.devDependencies, callback);
			}
			else {
				callback();
			}
		}
	], callback);
};

/**
 * Download the dependencies of a module
 * @param {String[]} deps Array of dependencies name
 * @param {Function} callback Callback function (err)
 */
Provider.prototype.cloneDeps = function (deps, callback) {
	var self = this;

	if (!deps) {
		return callback();
	}

	async.forEach(Object.keys(deps), function (dep, callback) {
		var ver = deps[dep].replace(' ', '').replace('>', '').replace('=', '').replace('~', '').replace('x', '0');
		if (!self.isModuleExist(dep, ver)) {
			self.cloneModule(dep, ver, callback);
		}
		else {
			console.info(colors.gray(dep + ' already exists'));
			callback();
		}
	}, callback);
};

module.exports = Provider;
