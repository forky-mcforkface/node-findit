var find = require('../');
var test = require('tap').test;
var path = require('path');

test('stop', function (t) {
    t.plan(1);
    
    var finder = find(__dirname + '/stop');
    var files = [];
    finder.on('file', function (file) {
        files.push(path.relative(__dirname, file));
    });
    
    finder.on('directory', function (dir, stat, stop) {
        var d = path.basename(dir);
        if (d === 'c') stop();
        else if (d === 'w') stop();
    });
    
    finder.on('end', function () {
        t.deepEqual(files.sort(), [
            'stop/q/x',
            'stop/q/y',
            'stop/q/z/m',
            'stop/q/z/n',
            'stop/r/a',
            'stop/r/b'
        ]);
    });
});
