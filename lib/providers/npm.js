/**
 * Module dependencies
 */
var RegClient = require('npm-registry-client');
var os = require('os');
var client = new RegClient({
	registry: 'https://registry.npmjs.org/',
	cache: os.tmpDir() + '/' + Math.random().toString(16).slice(2)
});
var http = require('http');
var https = require('https');
var async = require('async');
var semver = require('semver');
var Provider = require('../provider');

/**
 * Create a new npm provider object
 * @class Npm Provider for npm modules
 * @param {String} basePath Local or in-memory repository directory
 * @param {Object} fileSystem Either fs or fs-compatible Object
 * @param {Boolean} incDeps Should download module dependencies
 * @param {Boolean} incDevDeps Should download module dev dependencies
 * @param {Function} cbUpdate Callback function (typeOfUpdate, content)
 */
var Npm = function (basePath, fileSystem, incDeps, incDevDeps, cbUpdate) {
	Provider.prototype.constructor.call(this, basePath, fileSystem, incDeps, incDevDeps, cbUpdate);
    this.packagesPath = fileSystem.join(basePath,"packages");

	try {
		fileSystem.mkdirpSync(this.packagesPath);
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
	return this.fileSystem.join(this.packagesPath, module + '-' + ver + '.json');
};

/**
 * Check if the module already exists (tar file)
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {Function} cb Callback function (err, exists)
 */
Npm.prototype.isModuleExist = function (module, ver, cb) {
	var self = this;
	self.fileSystem.readdir(self.basePath, function(err, files) {
		if(err) {
			return cb(err);
		}

		var found = false;
		async.each(files, function(file, callback) {
			if(file.substr(0,file.lastIndexOf('-'))==module) {
				var installedVer = file.substr(file.lastIndexOf('-')+1).replace('.tgz','');
				if (semver.valid(installedVer) && semver.satisfies(installedVer, ver)) {
					found = true;	
				}
				callback();
			} else {
				callback();
			}
		}, function(err) {
			if(err) throw err;
			cb(null,found);
		});
	});
};

/**
 * Download a single module to local or in-memory repository
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {Function} callback Callback function (err)
 */
Npm.prototype.cloneSingleModule = function (module, ver, callback) {
	var self = this;
	var fullPath = this.fileSystem.join(this.basePath, module);
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
                self.cbUpdate('regularUpdate',{message: 'no version was specified for ' + module, color: "gray"});
				if (pkg['dist-tags'] && pkg['dist-tags'].latest) {
					ver = pkg['dist-tags'].latest;
					self.cbUpdate('regularUpdate',{message: 'using the latest version of ' + module, color: "gray"});
				}
				else {
					var keys = Object.keys(pkg.versions);
					ver = keys[keys.length - 1];
					self.cbUpdate('regularUpdate',{message: 'there is no latest tag using the last version in the version object of ' + module, color: "gray"});
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
            self.cbUpdate('regularUpdate',{message: 'using version ' + ver + ' for module ' + module, color: "gray"});
			self.fileSystem.writeFile(self.fileSystem.join(self.packagesPath, module + '-' + ver + '.json'),JSON.stringify(packageJson, null, 4),callback);
		},
		function (callback) {
            self.cbUpdate('regularUpdate',{message: 'downloading tarball of ' + module + '-' + ver, color: "gray"});
			var file = self.fileSystem.createWriteStream(self.fileSystem.join(self.basePath, module + '-' + ver + '.tgz'));

			var downloadClient;
			if (packageJson.dist.tarball.indexOf('https://') > -1) {
				downloadClient = https;
			}
			else {
				downloadClient = http;
			}

			downloadClient.get(packageJson.dist.tarball, function (response) {
				var len = parseInt(response.headers['content-length'], 10);
				if (len > 2097152) {
					var current = 0;
					response.on("data", function(chunk) {
						current += chunk.length;
                        self.cbUpdate('downloadProgress',{percentage: (100 * current / len).toFixed(2)});
					});
				}
				response.pipe(file);
				file.on('finish', function () {
					file.end();
					callback();
				});
			});
		}
	], function (err) {
		callback(err, ver);
	});
};

module.exports = Npm;
