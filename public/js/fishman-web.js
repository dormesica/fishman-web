	$('#terminal').focus();
	var printProgress = function (term, percent) {
        if(percent <= 100) {
            var width = term.cols() - 10;
            var size = Math.round(width * percent / 100);
            var left = '', taken = '', i;
            for (i = size; i--;) {
                taken += '#';
            }
            
            for (i = width-size; i--;) {
                left += '-';
            }
            
            term.set_prompt('[' + taken + left + '] ' + percent + '%');

            if(percent == 100) {
                term.set_prompt('> fishman ');
            }
        }
    }

    var downloadFileFromBlob = (function () {
        var a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        return function (data, fileName) {
            var blob = new Blob(data, {
                type : "octet/stream"
            });
            var url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
        };
    }());

    $('#terminal').terminal(function (command, term) {
        var socket = io.connect();
        var fileLength = 0;
        fileBuffer = [];
        socket.on('finalDownloadToClientMD', function(streamSize) {
            ss(socket).on('finalDownloadToClient', function (stream) {
                stream.on('data',function(chunk) {
                    fileLength += chunk.length;
                    fileBuffer.push(chunk);
                    var precentage = ((fileLength / streamSize) * 100).toFixed(2);
                    printProgress(term, precentage);
                });

                stream.on('end', function () {
                    printProgress(term, 100);
                    var filedata = new Uint8Array(fileLength),
                    i = 0;

                    //== Loop to fill the final array
                    fileBuffer.forEach(function (buff) {
                        for (var j = 0; j < buff.length; j++) {
                                filedata[i] = buff[j];
                                    i++;
                            }
                    });

                    //== Download file in browser
                    downloadFileFromBlob([filedata], request.module+".tar");
                });
            });          
        });

        socket.on('criticalError', function (error) {
            term.error(error.message);
        });

        socket.on('regularUpdate', function (update) {
                term.echo('<div style="color:'+update.color+'">'+update.message+'</div>',{raw: true});
        });

        socket.on('downloadProgress', function (update) {
                printProgress(term, update.percentage);
        });

        if (command !== '') {
            var parsed = $.terminal.parse_command ('fishaman ' + command);
            if (parsed.args.length % 2 == 0) {
                var pm, m, version, incDeps, incDevDeps;
                for (var i=0; i<parsed.args.length; i+=2) {
                    if (parsed.args[i] == '--pm') {
                        pm = parsed.args[i+1];
                    } else if (parsed.args[i] == '--module' || parsed.args[i] == '-m') {
                        m = parsed.args[i+1];
                    } else if (parsed.args[i] == '--version' || parsed.args[i] == '-v') {
                        version = parsed.args[i+1];
                    } else if (parsed.args[i] == '--deps') {
                        incDeps = parsed.args[i+1];
                    } else if (parsed.args[i] == '--dev') {
                        incDevDeps = parsed.args[i+1];
                    } else {
                        term.error ('wrong input "' + parsed.args[i] +'"');
                    }
                }
                if(pm && m ) {
                    var request = {
                        pm : pm,
                        module : m
                    }

                    if(incDeps) {
                        request.incDeps = incDeps;
                    }

                    if(incDevDeps) {
                        request.incDevDeps = incDevDeps;
                    }

                    if(version) {
                        request.version = version;
                    }
                    socket.emit('fishmanRequest', request);
                } else {
                    term.error ('--pm and --module is required');
                }
            } else {
                term.error ('expected an even number of args');
            }
        } else {
            term.echo('');
        }
    }, {
        greetings: '',
        name: 'js_demo',
        height: $(window).height() * 0.25,
        prompt: '> fishman '
    });