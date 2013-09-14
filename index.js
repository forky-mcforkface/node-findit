var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');

module.exports = function walk (dir, opts, emitter, dstat) {
    if (!opts) opts = {};
    if (!emitter) {
        emitter = new EventEmitter;
        emitter._pending = 0;
        emitter._seenLink = {};
        emitter._seenFile = {};
    }
    emitter._pending ++;
    emitter.on('end', function () {
        emitter._seenLink = null;
        emitter._seenFile = null;
    });
    
    if (dstat) {
        var stopped = false;
        emitter.emit('directory', dir, dstat, function stop () {
            stopped = true;
        });
        emitter.emit('path', dir, dstat);
        if (!stopped) fs.readdir(dir, onreaddir);
        else check()
    }
    else fs.lstat(dir, function onstat (err, stat) {
        if (err) return emitter.emit('end');
        else if (stat.isSymbolicLink() && opts.followSymlinks) {
            emitter.emit('link', dir, stat);
            fs.readlink(dir, function (err, rfile) {
                if (err) return emitter.emit('end');
                var file_ = path.resolve(dir, rfile);
                emitter._seenLink[file_] = true;
                emitter.emit('readlink', dir, file_);
                fs.lstat(file_, onstat);
            });
        }
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
                if (err) check()
                else onstat(file, stat)
            });
        });
    }
    
    function onstat (file, stat) {
        if (stat.isDirectory()) {
            walk(file, opts, emitter, stat);
            check();
        }
        else if (stat.isSymbolicLink() && opts.followSymlinks) {
            if (emitter._seenLink[file]) return check();
            emitter._seenLink[file] = true;
            emitter.emit('link', file, stat);
            
            fs.readlink(file, function (err, rfile) {
                if (err) return check();
                var file_ = path.resolve(path.dirname(file), rfile);
                if (emitter._seenLink[file_]) return check();
                emitter._seenLink[file_] = true;
                
                emitter.emit('readlink', file, file_);
                fs.lstat(file_, function (err, stat_) {
                    if (err) return check();
                    emitter._pending ++;
                    onstat(file_, stat_);
                    check();
                });
            });
        }
        else if (stat.isSymbolicLink()) {
            emitter.emit('link', file, stat);
            emitter.emit('path', file, stat);
            check();
        }
        else {
            if (emitter._seenFile[file]) return check();
            emitter._seenFile[file] = true;
            emitter.emit('file', file, stat);
            emitter.emit('path', file, stat);
            check();
        }
    }
};
