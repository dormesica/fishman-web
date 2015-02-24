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
 * @param {Function} callback Callback function (err, package)
 */
Provider.prototype.readPackage = function (module, callback) {
	var self = this;
    var modulePath = path.join(this.basePath, module);
	var current = 0;
	var packageJson;
	async.whilst(function () {
		return !packageJson && current < supportedFiles.length;
	}, function (callback) {
		var packagePath = path.join(modulePath, self.packageFiles[current]);
		console.log(packagePath);
		fs.exists(packagePath, function (exists) {
			current++;
			if (exists) {
				packageJson = require(packagePath);
			}
			callback();
		});
	}, function (err) {
		if (err) {
			return callback(err);
		}
		if (!packageJson) {
			console.warn(colors.yellow('package file couldn\'t be found for module ' + module));
		}
		callback(null, packageJson);
	});
};

/**
 * Download a single module to local repository
 * @abstract
 * @param {String} module Module name
 * @param {Function} callback Callback function (err)
 */
Provider.prototype.cloneSingleModule = function (module, callback) {
	callback(new Error('Abstract method!'));
};

/**
 * Download module to local repository
 * @param {String} module Module name
 * @param {Function} callback Callback function (err)
 */
Provider.prototype.cloneModule = function (module, callback) {
	var self = this;
	var package;

	async.waterfall([
		function (callback) {
			self.cloneSingleModule(module, callback);
		},
		function (callback) {
			console.info(colors.green('done cloning ' + module));
			self.readPackage(module, callback);
		},
		function (_package, callback) {
			package = _package;
			if (self.incDeps && package && package.dependencies) {
				self.cloneDeps(Object.keys(package.dependencies), callback);
			}
			else {
				callback();
			}
		},
		function (callback) {
			if (self.incDevDeps && package && package.devDependencies) {
				self.cloneDeps(Object.keys(package.devDependencies), callback);
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
	async.forEach(deps, function (dep, callback) {
		if (!fs.existsSync(path.join(self.basePath, dep))) {
			self.cloneModule(dep, callback);
		}
		else {
			console.info(colors.gray(dep + ' already exists'));
			callback();
		}
	}, callback);
};

module.exports = Provider;
