const http = require('http');
const https = require('https');
const axios = require('axios');
const Provider = require('../provider');

class PypiProvider extends Provider {

    constructor(incDeps, incDevDeps, cbUpdate) {
        super(incDeps, incDevDeps, false, cbUpdate);

        this._downloaded = [];
    }

    getPackagePath(module, ver, path) {
        return this.fileSystem.join(
            this.getPackageFolder(path),
            `${module}-${ver}.json`
        );
    }

    getPackageFolder(path) {
        return this.fileSystem.join(path, 'packages');
    }

    isModuleExist(module, ver, path, callback) {
        // TODO change and should use semver to determine if a module is satisfied.
        const found = this._downloaded.some(pack => pack.module === module && pack.version === ver);
        callback(null, found);
    }

    cloneSingleModule(module, ver, path, callback) {
        axios.get(`https://pypi.org/pypi/${module}/json`)
            .then(res => {
                const pack = res.data;
                if (!pack.info.version) {
                    return callback(new Error(`Module ${module} is unpublished`))
                }

                if (!ver || ver === 'latest') {
                    this.cbUpdate('regularUpdate', {
                        message: `no version was specified for ${module}`,
                        color: 'gray',
                    });

                    ver = pack.info.version;
                    this.cbUpdate('regularUpdate', {
                        message: `using version ${ver} of ${module}`,
                        error: 'gray'
                    })
                }

                // TODO maybe download latest version that satisfies ver
                return new Promise((resolve, reject) => {
                    this.fileSystem.mkdir(this.getPackageFolder(path), err => {
                        if (err && err.code !== 'EEXIST') {
                            return reject(err);
                        }

                        this.fileSystem.writeFile(
                            this.getPackagePath(module, ver, path),
                            JSON.stringify(pack),  // match package.json format
                            err => err ? reject(err) : resolve(pack)
                        );
                    });
                })
            })
            .then(pack => {
                this.cbUpdate('regularUpdate', {
                    message: `downloading tarball of ${module}-${ver}`,
                    color: 'gray',
                });

                const downloads = pack.urls.map(distribution => new Promise((resolve, reject) => {
                    const file = this.fileSystem.createWriteStream(this.fileSystem.join(path, distribution.filename));
                    const client = distribution.url.indexOf('https') === 0 ? https : http;

                    client.get(distribution.url, response => {
                        const responseLength = parseInt(response.headers['content-length'], 10);
                        let current = 0;
                        response.on('data', chunk => {
                            current += chunk.length;
                            this.cbUpdate('downloadProgress', { percentage: ((100 * current) / responseLength).toFixed(2) })
                        });
                        response.on('error', reject);
                        // response.on('end', resolve);
                        response.pipe(file);
                        file.on('finish', resolve);
                    });
                }));

                return Promise.all(downloads);
            })
            .then(() => {
                this._downloaded.push({
                    module,
                    version: ver
                });
                callback();
            })
            .catch(callback);
    }

}

module.exports = PypiProvider;
