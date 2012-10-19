var express = require('express');
var app = express();
var codes = 'HfXWlPMmcrsbKakTedBF50p6yQ3RIvgAGDCZ2ULjz7JuEqinoS8O4V9Nw1txhY';
var codeToken = [];
// 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
// shuffle!
// HfXWlPMmcrsbKakTedBF50p6yQ3RIvgAGDCZ2ULjz7JuEqinoS8O4V9Nw1txhY

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
	res.send('member page');
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

function codeToNum(code)
{
	if(code.length < 4) return 0;

	var ck = code.substring(code.length, code.length - 3);
	code = code.substr(0, code.length - 3);
	var num = 0;

	for(var i = 0, j = 1; i < code.length; i++, j*= 62)
		num+= (codes.indexOf(code.substr(i, 1))) * j;

	if(ck == checkKey(num))
		return num;
	else
		return 0;
}

function checkKey(num)
{
	var prime = [94993, 1259, 13259];
	var res = '';

	for(var i = 0; i < 3; i++)
		res+= codeToken[prime[i] * num % 62];

	return res;
}

for(var i = 0; i < 62; i++)
	codeToken[i] = codes.substr(i, 1);

exports.app = app;