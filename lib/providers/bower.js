/**
 * Module dependencies
 */
var clone = require('nodegit').Clone.clone;
var bowerClient = require('bower');
var fs = require('fs');
var colors = require('colors/safe');
var async = require('async');
var path = require('path');
var Provider = require('../provider');

/**
 * Create a new Bower provider object
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
* Return path to the package file
* @param {String} module Module name
* @param {String} ver Version string
* @return {String} path to the package file
*/
Bower.prototype.getPackagePath = function (module, ver) {
	return path.join(this.basePath, module, 'bower.json');
};

/**
* Check if the module already exists
* @param {String} module Module name
* @param {String} ver Version string
* @param {Function} cb Callback function (err, exists)
*/
Bower.prototype.isModuleExist = function (module, ver, cb) {
	var self = this;
	fs.exists(path.join(self.basePath, module), function (exists) {
		cb(null, exists);
	});
};

/**
 * Download a single module to local repository
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {Function} callback Callback function (err)
 */
Bower.prototype.cloneSingleModule = function (module, ver, callback) {
	var fullPath = path.join(this.basePath, module);
	console.log('getting url for ' + module);
	bowerClient.commands
  		.lookup(module)
		.on('end', function (data) {
			if(data) {
				var url = data.url;
				console.log('cloning ' + module);
				clone(url, fullPath, null)
					.then(function (repo) {
						callback(null, 'latest');
					})
					.catch(function (err) {
						callback(err);
					});
			} else {
				console.warn(colors.red('couldn\'t find module ' + module));
				return callback(null, 'latest');
			}
  		})
};

module.exports = Bower;
