/**
 * Module dependencies
 */
var async = require('async');
var tar = require('tar-stream');

/**
 * Create a new Provider object
 * @abstract
 * @class Provider Base class for package manager providers
 * @param {String} basePath Local or in-memory repository directory
 * @param {Object} fileSystem Either fs or fs-compatible Object
 * @param {Boolean} incDeps Should download module dependencies
 * @param {Boolean} incDevDeps Should download module dev dependencies
 * @param {Function} cbUpdate Callback function (typeOfUpdate, content)
 */
var Provider = function (basePath, fileSystem, incDeps, incDevDeps, cbUpdate) {
	this.basePath = basePath;
	this.incDeps = incDeps;
	this.incDevDeps = incDevDeps;
	this.fileSystem = fileSystem;
	this.cbUpdate = cbUpdate;
};

/*
* Abstract Methods
*/

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
Provider.prototype.isModuleExist = function (module, ver, callback) {
	throw new Error('Abstract method!');
};

/**
 * Download a single module to local or in-memory repository
 * @abstract
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {Function} callback Callback function (err, ver)
 */
Provider.prototype.cloneSingleModule = function (module, ver, callback) {
	callback(new Error('Abstract method!'));
};

/*
* End of Abstract Methods
*/

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
 * @param {String} packagePath file path
 * @param {Function} callback Callback function (err, package)
 */
Provider.prototype.readPackageFromPath = function (packagePath, callback) {
	var self = this;
	this.fileSystem.exists(packagePath, function (exists) {
		var errorMessage, packageJson;
		if (exists) {
			self.fileSystem.readFile(packagePath,function (error, fileContents) {
				if (error) throw err;
				packageJson = JSON.parse(fileContents);
				callback(null, packageJson);
			});
		} else {
			errorMessage = 'package file couldn\'t be found: ' + packagePath;
		    self.cbUpdate('criticalError',{message: errorMessage});
			callback(new Error(errorMessage));
		}
	});
};

/**
 * Clone a package file
 * @abstract
 * @param {String} packagePath file path
 * @param {Function} callback Callback function (err)
 */
Provider.prototype.clonePackageFile = function (packagePath, callback) {
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
Provider.prototype.clonePackage = function (package, callback){
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
 * Download module to local or in-mremory repository
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
            self.cbUpdate('regularUpdate',{message: 'done cloning '+ module, color: "green"});
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
                self.cbUpdate('regularUpdate',{message: dep +' already exists', color: "gray"});
				callback();
			}
		});
	}, callback);
};


Provider.prototype.getDownloadStreamFromBasePath = function (stream, callback) {
	var self = this;
	var pack = tar.pack();
	var totalSize = 0;
	var loopFolder = function(fullPath, cbFinishedFolder, cbFinishedAllFolders) {
		self.fileSystem.readdir(fullPath, function(err, files) {
			if(err) throw err;
			async.each(files, function(file, cbNextFile) {
				var fileFakePath = self.fileSystem.join(fullPath,file);
				if(self.fileSystem.statSync(fileFakePath).isFile()) {	
					self.fileSystem.readFile(fileFakePath, function (err, contents) {
						totalSize+=contents.length;
						pack.entry({name: fileFakePath}, contents, function (err) {
							if (err) throw err
							cbNextFile();
						});
					});			
				} else {
					loopFolder(self.fileSystem.join(fullPath,file),cbNextFile);
				}
			}, function(err) {
				if(err) throw err;
				if(cbFinishedFolder) {
					cbFinishedFolder();
				} else if(cbFinishedAllFolders) {
					cbFinishedAllFolders();
				}
			});
		});
	}

	async.waterfall([
			function (cbFinishedAllFolders) {
				loopFolder(self.basePath,null,cbFinishedAllFolders);
			},
			function (cbFinishedPacking) {
				pack.finalize();
				pack.pipe(stream.stream);
                self.cbUpdate('regularUpdate',{message: 'finished packing, starting download', color: "green"});
				stream.size = totalSize;
				cbFinishedPacking();
			},
		], function (error) {
            self.cbUpdate('finalDownloadToClient');
		});
	
	
};

module.exports = Provider;