/**
 * Module dependencies
 */
var clone = require('nodegit').Clone.clone;
var RegistryClient = require('bower-registry-client');
var registry = new RegistryClient();
var colors = require('colors/safe');
var async = require('async');
var path = require('path');
var fs = require('fs');
var Provider = require('../provider');

/**
 * Create a new Bower provider object
 * @abstract
 * @class Bower Provider for bower modules
 * @param {String} basePath Local repository directory
 * @param {Boolean} incDeps Should download module dependencies
 * @param {Boolean} incDevDeps Should download module dev dependencies
 */
var Bower = function (basePath, incDeps, incDevDeps) {
	Provider.prototype.constructor.call(this, basePath, incDeps, incDevDeps);
	this.packageFiles = ['bower.json'];
};

Bower.prototype = new Provider();
Bower.prototype.constructor = Bower;

/**
 * Download a single module to local repository
 * @abstract
 * @param {String} module Module name
 * @param {Function} callback Callback function (err)
 */
Bower.prototype.cloneSingleModule = function (module, callback) {
	var fullPath = path.join(this.basePath, module);
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
				callback();
			})
			.catch(function (err) {
				callback(err);
			});
	});
};

module.exports = Bower;
