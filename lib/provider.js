/**
 * Module dependencies
 */
var async = require('async');
var tar = require('tar-stream');

/**
 * Create a new Provider object
 * @abstract
 * @class Provider Base class for package manager providers
 * @param {Object} fileSystem Either fs or fs-compatible Object
 * @param {Boolean} incDeps Should download module dependencies
 * @param {Boolean} incDevDeps Should download module dev dependencies
 * @param {Boolean} incTypes Should download types module (like typescript module)
 * @param {Function} cbUpdate Callback function (typeOfUpdate, content)
 */
var Provider = function (fileSystem, incDeps, incDevDeps, incTypes, cbUpdate) {
	this.incDeps = incDeps;
	this.incDevDeps = incDevDeps;
	this.fileSystem = fileSystem;
	this.incTypes = incTypes;
	this.cbUpdate = cbUpdate;
};

/*
* Abstract Methods
*/

/**
 * Return path to the package file
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {String} path current path 
 * @return {String} path to the package file
 */
Provider.prototype.getPackagePath = function (module, ver, path) {
	throw new Error('Abstract method!');
};

/**
 * Return path to the package folder
 * @param {String} path Current path
 * @return {String} path to the package folder
 */
Provider.prototype.getPackageFolder = function (path) {
	throw new Error('Abstract method!');
};

/**
 * Download a type module to local or in-memory repository
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {String} path current path 
 * @return {String} path to the package file
 */
Provider.prototype.getTypesModuleIfExist = function (module, ver, path) {
	throw new Error('Abstract method!');
};


/**
 * Check if the module already exists
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {String} path Current path 
 * @param {Function} callback Callback function (err, exists)
 */
Provider.prototype.isModuleExist = function (module, ver, path, callback) {
	throw new Error('Abstract method!');
};

/**
 * Download a single module to local or in-memory repository
 * @abstract
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {String} path Current path 
 * @param {Function} callback Callback function (err, ver)
 */
Provider.prototype.cloneSingleModule = function (module, ver, path, callback) {
	callback(new Error('Abstract method!'));
};

/*
* End of Abstract Methods
*/

/**
 * Read the package metadata
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {String} path Current path
 * @param {Function} callback Callback function (err, package)
 */
Provider.prototype.readPackage = function (module, ver, path, callback) {
	var packagePath = this.getPackagePath(module, ver, path);
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
				if (error) throw error;
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
Provider.prototype.clonePackage = function (package, path, callback){
	var self = this;

	async.waterfall([
		function (callback) {
			if (self.incDeps && package && package.dependencies) {
				self.cloneDeps(package.dependencies, path, callback);
			}
			else {
				callback();
			}
		},
		function (callback) {
			if (self.incDevDeps && package && package.devDependencies) {
				self.cloneDeps(package.devDependencies, path, callback);
			}
			else {
				callback();
			}
		}
	], callback);
};

/**
 * Download module to local or in-memory repository
 * @param {String} module Module name
 * @param {String} ver Version string
 * @param {String} path Path for downloaded
 * @param {Function} callback Callback function (err)
 */
Provider.prototype.cloneModule = function (module, ver, path, callback) {
	var self = this;
	var escapedModule = module.replace('/','%2f');
	async.waterfall([
		function (callback) {
			self.cloneSingleModule(escapedModule, ver, path, callback);
		},
		function (ver, callback) {
			// TODO add checks if this module is not module type
			if(self.incTypes)
				self.getTypesModuleIfExist(escapedModule, ver, path, callback);
			else
				callback(null, ver);
				
		},
		function (ver, callback) {
            self.cbUpdate('regularUpdate',{message: 'done cloning '+ escapedModule, color: "green"});
			self.readPackage(escapedModule, ver, path, callback);
		},
		function (package, callback) {
			self.clonePackage(package, path, callback);
		},
	], callback);
};

/**
 * Download the dependencies of a module
 * @param {String[]} deps Array of dependencies name
 * @param {Function} callback Callback function (err)
 */
Provider.prototype.cloneDeps = function (deps, path, callback) {
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

		self.isModuleExist(dep, ver, path, function(err, exists) {
			if (err) {
				callback(err);
			}
			else if (!exists) {
				self.cloneModule(dep, ver, path, callback);
			}
			else {
                self.cbUpdate('regularUpdate',{message: dep +' already exists', color: "gray"});
				callback();
			}
		});
	}, callback);
};

Provider.prototype.getDownloadStreamFromBasePath = function (stream, path, callback) {
	var self = this;
	var pack = tar.pack();
	var totalSize = 0;
	var loopFolder = function(fullPath, callback) {
		self.fileSystem.readdir(fullPath, function(err, files) {
			if(err) throw err;

			async.each(files, function(file, cbNextFile) {
				var fileFakePath = self.fileSystem.join(fullPath,file);
				self.fileSystem.stat(fileFakePath, function(err, stat) {
					if (stat.isDirectory()){
						loopFolder(self.fileSystem.join(fullPath, file), cbNextFile);
					} else {
						self.fileSystem.readFile(fileFakePath, function (err, contents) {
							totalSize+=contents.length;
							pack.entry({name: fileFakePath}, contents, function (err) {
								if (err) throw err;

								cbNextFile();
							});
						});	
					}
				})
			}, function(err) {
				if(err) throw err;
				
				callback();
			});
		});
	}

	async.waterfall([
			function (cbFinishedAllFolders) {
				loopFolder(path, cbFinishedAllFolders);
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