#!/usr/bin/env Node

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var memoryFileSystem = require('memory-fs');
var ss = require('socket.io-stream');
var fishmanWeb = require('../lib');
var path = require('path'); //used only for express to serve statics


app.use(express.static(path.join(__dirname, '..', 'public')));

server.listen(process.env.PORT || 8080);

io.on('connection', function (socket) {
    socket.on('fishmanRequest', function (request) {
        var options = {
            packageManager: request.pm,
            module: request.module,
            incDeps: true,
            incDevDeps: false,
            basePath: "/"
        };

        if(request.incDeps) {
            options.incDeps = request.incDeps;
        }

        if(request.incDevDeps) {
            options.incDevDeps = request.incDevDeps;
        }

        if(request.version) {
            options.version = request.version;
        }

        var fileSystem = new memoryFileSystem();

        var finalDownload = {
            stream: ss.createStream(),
            size: 0
        };

        fishmanWeb.cloneModule(options, fileSystem, finalDownload, function (typeOfUpdate, content) {
            if (typeOfUpdate == 'downloadProgress' || typeOfUpdate == 'regularUpdate' || 
                typeOfUpdate == 'criticalError') {
                socket.emit(typeOfUpdate, content);

                if(typeOfUpdate == 'criticalError') {
                    socket.disconnect();
                }

            } else if (typeOfUpdate == 'finalDownloadToClient') {
                socket.emit('finalDownloadToClientMD', finalDownload.size);
                ss(socket).emit(typeOfUpdate, finalDownload.stream);
            } else {
                console.log('this should never happen - typeOfUpdate ' + typeOfUpdate +' did not match!');
            }
        });
    });

    //TODO
    /*
    socket.on('disconnect', function () {
    });
    */
});