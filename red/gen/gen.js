/**
 * Created by MAC on 15/10/15.
 */
var fs = require('fs');
var fileUtil = require("../util/FileUtil");
var distPath = "download/";//拷贝目录
var srcPath = "nodes/core/";//源目录
var typeRegistry = require("../nodes/registry");


var map = {
    "inject":"20-inject.js",
    'debug':'58-debug.js',
    'function':'80-function.js'
};

function createNode(config) {

    for (var i=0;i<config.length;i++) {
        var nodeConfig = config[i];
        var nodeType = nodeConfig.type;

        if (nodeType != "tab" && nodeType != "subflow") {
            fileUtil.copy(srcPath+"core/"+map[nodeType],distPath+map[nodeType]);
            //var a = typeRegistry.get(nodeType);
            //fileUtil.walk("./bin",1, handleFile)
        }
    }

}

function copy(src, dst) {
    fs.writeFileSync(dst, fs.readFileSync(src));
}


function handleFile(path, floor) {
    var blankStr = '';
    for (var i = 0; i < floor; i++) {
        blankStr += '    ';
    }

    fs.stat(path, function(err1, stats) {
        if (err1) {
            console.log('stat error');
        } else {
            if (stats.isDirectory()) {
                console.log('+' + blankStr + path);
            } else {
                console.log('-' + blankStr + path);
            }
        }
    })
}


module.exports = {
    createNode: createNode
};