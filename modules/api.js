var express = require('express');
var app = express();

exports.app = app;
exports.ready = function() {
	var modules = global.modules;
	var config = global.config;

	app.get('/', function(req, res){
		res.send('this page is api');
	});
}