var express = require('express');
var app = express();

var modules = global.modules;
var config = global.config;

app.get('/', function(req, res){
	res.send('this page is site');
});

exports.app = app;