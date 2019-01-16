/**
 * Module dependencies
 */
const Npm = require('./providers/npm'); //gg
const async = require('async');

/**
 * Download module and its dependencies from different package managers
 * @param {Object} options:
 *		packageManager: Package manager name
 *		module: Module name
 *		version: Version string
 *		basePath: Local or in-memory repository directory
 *		incDeps: Should download module dependencies
 *		incDevDeps: Should download module dev dependencies
 * @param {Object} fileSystem: Either fs or fs-compatible Object
 * @param {Object} result:
 *      stream: (socket.io-stream).createStream() object
 *      size: Length of above stream
 * @param {Function} cbUpdate Callback function (typeOfUpdate, content)
 */
function cloneModule(
    { packageManager, basePath, incDeps, incDevDeps, incTypes }, 
    fileSystem, 
    streamToWriteTo, 
    cbUpdate
) { 
    let provider;

    switch (packageManager) {
        case 'npm':
            provider = new Npm(fileSystem, incDeps, incDevDeps, incTypes, cbUpdate);
            break;
    }

    if (!provider) {
        cbUpdate('criticalError', { message: 'this package manager is not supported!' });
    } else {
        let moduleFailed = 0;
        async.each(
            options.modules,
            function(module, cbFinish) {
                // If module name contains '/' char, replace it with '-'
                const path = fileSystem.join(
                    options.basePath,
                    `${module.name.replace('/', '-')}${module.ver ? `-${module.ver}` : ''}`
                );
                async.waterfall(
                    [
                        function(callback) {
                            fileSystem.mkdir(path, function(err) {
                                callback(err);
                            });
                        },
                        function(callback) {
                            provider.cloneModule(module.name, module.ver, path, callback);
                        },
                    ],
                    function(err) {
                        if (err) {
                            cbUpdate('regularUpdate', {
                                message: `failed to cloned ${module.name} ${err.toString()}`,
                                color: 'red',
                            });
                            moduleFailed++;
                        }

                        if (moduleFailed == options.modules.length) {
                            return cbFinish('Failed to download packages');
                        }

                        cbFinish();
                    }
                );
            },
            function(err) {
                if (err) {
                    cbUpdate('criticalError', { message: 'something wrong happened!! ' + err.toString() });
                } else {
                    provider.getDownloadStreamFromBasePath(streamToWriteTo, options.basePath, function(err) {
                        cbUpdate('criticalError', { message: 'something wrong happened!! ' + err.toString() });
                    });
                }
            }
        );
    }
};

exports.cloneModule = cloneModule;
