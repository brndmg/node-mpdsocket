var fs = require('fs');

var results = {};

var protocolDir = "/protocol";

var files = fs.readdirSync(__dirname + protocolDir);

var txtfiles = files.filter(function(file) { 
	//console.log(file);
	return file.substr(-4) == '.txt'; 
});

txtfiles.forEach(function(file) { 
	readFile(file, fs.readFileSync(__dirname + protocolDir + '/' + file, 'utf-8'));
});

function readFile(file, contents) {
	var key = file.substr(0, file.lastIndexOf('.'));
    results[key] = contents;
}

module.exports = results;