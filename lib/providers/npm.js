/**
 * Module dependencies
 */
var RegClient = require('npm-registry-client');
var os = require('os');
var client = new RegClient({
	registry: 'https://registry.npmjs.org/',
	cache: os.tmpDir() + '/' + Math.random().toString(16).slice(2)
});
var https = require('https');
var fs = require('fs');
var colors = require('colors/safe');
var async = require('async');
var path = require('path');
var semver = require('semver');
var glob = require('glob');
var Provider = require('../provider');

/**
 * Create a new npm provider object
 * @class Bower Provider for bower modules
 * @param {String} basePath Local repository directory
 * @param {Boolean} incDeps Should download module dependencies
 * @param {Boolean} incDevDeps Should download module dev dependencies
 */
var Npm = function (basePath, incDeps, incDevDeps) {
	Provider.prototype.constructor.call(this, basePath, incDeps, incDevDeps);
	this.packagesPath = path.join(basePath, 'packages');
	try {
		fs.mkdirSync(this.packagesPath);
	}
	catch (e) {
		if (e.code !== 'EEXIST') throw e;
	}
};

Npm.prototype = new Provider();
Npm.prototype.constructor = Npm;

/**
 * Return path to the package file
 * @param {String} module Module name
 * @param {String} ver Version string
 * @return {String} path to the package file
 */
Npm.prototype.getPackagePath = function (module, ver) {
	return path.join(this.packagesPath, module + '-' + ver + '.json');
};

/**
 * Check if the module already exists (tar file)
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {Function} cb Callback function (err, exists)
 */
Npm.prototype.isModuleExist = function (module, ver, cb) {
	var self = this;
	glob(module + '-*.tgz', {
		cwd: self.basePath
	}, function (err, files) {
		if (err) {
			return cb(err);
		}
		var found = false;
		for (var i = 0; i < files.length; i++) {
			var installedVer = files[i].replace(module + '-', '').replace('.tgz', '');
			if (semver.valid(installedVer) && semver.satisfies(installedVer, ver)) {
				found = true;
				break;
			}
		}
		cb(null, found);
	});
};

/**
 * Download a single module to local repository
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {Function} callback Callback function (err)
 */
Npm.prototype.cloneSingleModule = function (module, ver, callback) {
	var self = this;
	var fullPath = path.join(this.basePath, module);
	var packageJson, chosenVer;
	async.waterfall([
		function (callback) {
			client.get('https://registry.npmjs.org/' + module, {timeout: 1000}, function (err, pkg) {
				callback(err, pkg);
			});
		},
		function (pkg, callback) {
			if(!pkg.versions){
				return callback(new Error('Module ' + module + ' is unpublished'));
			}

			if (!ver || ver === 'latest') {
				console.log('no version was specified for ' + module);
				if (pkg['dist-tags'] && pkg['dist-tags'].latest) {
					ver = pkg['dist-tags'].latest;
					console.log('using the latest version of ' + module);
				}
				else {
					var keys = Object.keys(pkg.versions);
					ver = keys[keys.length - 1];
					console.warn(colors.yellow('there is no latest tag using the last version in the version object of ' + module));
				}
			}
			var versions = Object.keys(pkg.versions);
			for (var i = versions.length; i > -1; i--) {
				if (semver.satisfies(versions[i], ver)) {
					ver = versions[i];
					break;
				}
			}

			if(!pkg.versions[ver]){
				return callback(new Error('No compatibale version was found for ' + module + ' - ' + ver ));
			}
			
			packageJson = pkg.versions[ver];
			console.log('using version ' + ver + ' for module ' + module);
			fs.writeFile(path.join(self.packagesPath, module + '-' + ver + '.json'), JSON.stringify(packageJson, null, 4), callback);
		},
		function (callback) {
			console.log('downloading tarball of ' + module + '-' + ver);
			var file = fs.createWriteStream(path.join(self.basePath, module + '-' + ver + '.tgz'));
			var request = https.get(packageJson.dist.tarball, function (response) {
				response.pipe(file);
				file.on('finish', function () {
					file.close(callback);
				});
			});
		}
	], function (err) {
		callback(err, ver);
	});
};

module.exports = Npm;
