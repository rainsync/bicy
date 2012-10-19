var express = require('express');
var app = express();

app.get('/', function(req, res){
	res.send('this page is example change');
});

exports.app = app;