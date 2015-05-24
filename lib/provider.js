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
	var packagePath = this.getPackagePath(module, ver);
	this.readPackageFromPath(packagePath, callback);
};

/**
 * Read the package metadata from a given path
 * @param {String} package file path
 * @param {Function} callback Callback function (err, package)
 */
Provider.prototype.readPackageFromPath = function(packagePath, callback) {
	fs.exists(packagePath, function (exists) {
		var errorMessage, packageJson;
		if (exists) {
			packageJson = require(packagePath);
			callback(null, packageJson);
		} else {
			errorMessage = 'package file couldn\'t be found: ' + packagePath;
			console.warn(colors.yellow(errorMessage));
			callback(new Error(errorMessage));
		}
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
 * @param {Function} callback Callback function (err, exists)
 */
Provider.prototype.isModuleExist = function (module, ver, cb) {
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
 * Clone a package file
 * @abstract
 * @param {String} package file path
 * @param {Function} callback Callback function (err)
 */
Provider.prototype.clonePackageFile = function(packagePath, callback) {
	var self = this;

	async.waterfall([
		function (callback) {
			self.readPackageFromPath(packagePath, callback);
		},
		function (package, callback) {
			self.clonePackage(package, callback);
		}
	], callback);
};

/**
 * Clone a package
 * @abstract
 * @param {Object} package object
 * @param {Function} callback Callback function (err)
 */
Provider.prototype.clonePackage = function(package, callback){
	var self = this;

	async.waterfall([
		function (callback) {
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
 * Download module to local repository
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {Function} callback Callback function (err)
 */
Provider.prototype.cloneModule = function (module, ver, callback) {
	var self = this;

	async.waterfall([
		function (callback) {
			self.cloneSingleModule(module, ver, callback);
		},
		function (ver, callback) {
			console.info(colors.green('done cloning ' + module));
			self.readPackage(module, ver, callback);
		},
		function (package, callback) {
			self.clonePackage(package, callback);
		},
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

	async.eachSeries(Object.keys(deps), function (dep, callback) {
		var ver = deps[dep];

		// Not supporting cloning modules from git repositories yet.
		if(/^(git|http|https|ssh)\:.*/.test(ver)){
			return callback();
		}

		self.isModuleExist(dep, ver, function(err, exists) {
			if (err) {
				callback(err);
			}
			else if (!exists) {
				self.cloneModule(dep, ver, callback);
			}
			else {
				console.info(colors.gray(dep + ' already exists'));
				callback();
			}
		});
	}, callback);
};

module.exports = Provider;
