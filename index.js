var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');

module.exports = function walk (dir, opts, emitter, dstat) {
    if (!opts) opts = {};
    if (!emitter) {
        emitter = new EventEmitter;
        emitter._pending = 0;
    }
    emitter._pending ++;
    
    if (dstat) {
        var stopped = false;
        emitter.emit('directory', dir, dstat, function stop () {
            stopped = true;
        });
        emitter.emit('path', dir, dstat);
        if (!stopped) fs.readdir(dir, onreaddir);
        else check()
    }
    else fs.lstat(dir, function (err, stat) {
        if (err) return emitter.emit('end');
        else if (stat.isSymbolicLink()) {
            emitter.emit('link', dir, stat);
            emitter.emit('path', dir, stat);
            emitter.emit('end');
        }
        else if (stat.isDirectory()) {
            var stopped = false;
            emitter.emit('directory', dir, stat, function stop () {
                stopped = true;
            });
            emitter.emit('path', dir, stat);
            if (!stopped) fs.readdir(dir, onreaddir);
            else check()
        }
        else {
            emitter.emit('file', dir, stat);
            emitter.emit('path', dir, stat);
            emitter.emit('end');
        }
    });
    
    return emitter;
    
    function check () {
        if (-- emitter._pending === 0) finish();
    }
    
    function finish () {
        emitter.emit('end');
    }
    
    function onreaddir (err, files) {
        emitter._pending --;
        if (err) return check();
        
        files.forEach(function (rfile) {
            emitter._pending ++;
            var file = path.join(dir, rfile);
            
            fs.lstat(file, function (err, stat) {
                if (!err && stat.isDirectory()) {
                    walk(file, opts, emitter, stat);
                }
                else if (!err && stat.isSymbolicLink()) {
                    emitter.emit('link', file, stat);
                    emitter.emit('path', file, stat);
                }
                else if (!err) {
                    emitter.emit('file', file, stat);
                    emitter.emit('path', file, stat);
                }
                check();
            });
        });
    }
};
