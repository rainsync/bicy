var express = require('express');
var app = express();

app.get('/', function(req, res){
	res.send('this page is site');
});

exports.app = app;
exports.filename = __filename;