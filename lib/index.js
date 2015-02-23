var clone = require('nodegit').Clone.clone,
	fs = require('fs');
var path = require('path'),
	async = require('async');
var RegistryClient = require('bower-registry-client');
var colors = require('colors/safe');
var registry = new RegistryClient();

/**
 * Download bower module and
 * @param {String} module Bower module name
 * @param {String} basePath Local repository directory
 * @param {Boolean} incDeps Should download module dependencies
 * @param {Boolean} incDevDeps Should download module dev dependencies
 * @param {Function} callback Callback function (err)
 */
var cloneModule = function (module, basePath, incDeps, incDevDeps, callback) {
	var fullPath = path.join(basePath, module);
	console.log('getting url for ' + module);
	registry.lookup(module, function (err, entry) {
		if (!entry) {
			console.warn(colors.red('couldn\'t find module ' + module));
			return callback();
		}
		var url = entry.url;
		console.log('cloning ' + module);
		clone(url, fullPath, null)
			.then(function (repo) {
				console.info(colors.green('done cloning ' + module));
				async.waterfall([
					function (callback) {
						if (incDeps) {
							cloneDeps(module, basePath, incDeps, incDevDeps, 'dependencies', callback);
						}
						else {
							callback();
						}
					},
					function (callback) {
						if (incDevDeps) {
							cloneDeps(module, basePath, incDeps, incDevDeps, 'devDependencies', callback);
						}
						else {
							callback();
						}
					}
				], callback);
			})
			.catch(function (err) {
				callback(err);
			});;
	});
};

/**
 * Download bower module dependencies
 * @param {String} module Bower module name
 * @param {String} basePath Local repository directory
 * @param {Boolean} incDeps Should download module dependencies
 * @param {Boolean} incDevDeps Should download module dev dependencies
 * @param {String} depProperty The dependencies property in package.json
 * @param {Function} callback Callback function (err)
 */
var cloneDeps = function (module, basePath, incDeps, incDevDeps, depProperty, callback) {
	var modulePath = path.join(basePath, module);
	var packages;
	if (fs.existsSync(path.join(modulePath, 'bower.json'))) {
		packages = require(path.join(modulePath, 'bower.json'));
	}
	else if (fs.existsSync(path.join(modulePath, 'package.json'))) {
		packages = require(path.join(modulePath, 'package.json'));
	}
	else {
		console.warn(colors.yellow('package.json/bower.json couldn\'t be found for module ' + module));
		return callback();
	}
	if (!packages[depProperty]) {
		return callback();
	}
	var deps = Object.keys(packages[depProperty]);
	async.forEach(deps, function (dep, callback) {
		if (!fs.existsSync(path.join(basePath, dep))) {
			cloneModule(dep, basePath, incDeps, incDevDeps, callback);
		}
		else {
			console.info(colors.gray(dep + ' already exists'));
			callback();
		}
	}, callback);
};

exports.cloneModule = cloneModule;
