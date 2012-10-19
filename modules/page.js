var express = require('express');
var app = express();
var config = require('../config').config;
var code = config.shortUrl.base62code;
var codeToken = [];

app.get('/', function(req, res){
	res.send('this page is pagess');
});

app.get('/ntc/:num', function(req, res){
	res.send(numToCode(req.params.num) + checkKey(req.params.num));
});

app.get('/ctn/:code', function(req, res){
	res.send(String(codeToNum(req.params.code)));
});

app.get('/:shortUrl', function(req, res){
	res.send('short url page');
});

app.get('/:id/:page', function(req, res){
	res.send('member page', req.params.id, req.params.page);
});

function numToCode(num)
{
	if(num == 0) return '';

	var res = '';

	while(num > 0)
	{
		var n = num % 62;
		res+= codeToken[n];;
		num = Math.floor(num / 62);
	}

	return res;
}

function codeToNum(cd)
{
	if(cd.length < 4) return 0;

	var ck = cd.substring(cd.length, cd.length - 3);
	cd = cd.substr(0, cd.length - 3);
	var num = 0;

	for(var i = 0, j = 1; i < cd.length; i++, j*= 62)
		num+= (code.indexOf(cd.substr(i, 1))) * j;

	if(ck == checkKey(num))
		return num;
	else
		return 0;
}

function checkKey(num)
{
	var prime = config.shortUrl.prime;
	var res = '';

	for(var i = 0; i < 3; i++)
		res+= codeToken[prime[i] * num % 62];

	return res;
}

for(var i = 0; i < 62; i++)
	codeToken[i] = code.substr(i, 1);

exports.app = app;