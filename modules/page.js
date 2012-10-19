var express = require('express');
var config = require('../config').config;
var redis = require('redis');
var app = express();
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

app.get('/makeurl', function(req, res){
	redis.store.incr('short_url_index', function(err, data){
		var n = Number(data);

		redis.store.set('short_url_data:' + n, JSON.stringify({
			type: 'location',
			dest: req.query["url"]
		}));

		res.send('url : http://page.bicy.com/' + numToCode(n));
	});
});

app.get('/:shortUrl', function(req, res){
	if(config.redis.enabled == false)
	{
		res.send(503);
		return;
	}

	var n = codeToNum(req.params.shortUrl);
	if(n == 0)
	{
		res.send(404);
		return;
	}

	//shortUrl Processing
	redis.store.get('short_url_data:' + n, function(err, data){
		var parse = JSON.parse(String(data));

		if(parse.type == 'location')
		{
			res.statusCode = 302;
			res.header('Location', parse.dest);
			res.end();
		}
	});
});

app.get('/:id/:page', function(req, res){
	res.send('member page', req.params.id, req.params.page);
});

function numToCode(num)
{
	if(num == 0) return '';

	var ck = checkKey(num);
	var res = '';

	while(num > 0)
	{
		var n = num % 62;
		res+= codeToken[n];;
		num = Math.floor(num / 62);
	}

	return res + ck;
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