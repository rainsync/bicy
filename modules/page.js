var express = require('express');
var app = express();

exports.app = app;
exports.ready = function() {
	var modules = global.modules;
	var config = global.config;

	var code = config.shortUrl.base62code;
	var codeToken = [];

	app.get('/', function(req, res){
		res.send('this page is page');
	});

	app.get('/ntc/:num', function(req, res){
		res.send(indexToCode(req.params.num) + checkKey(req.params.num));
	});

	app.get('/ctn/:code', function(req, res){
		res.send(String(codeToIndex(req.params.code)));
	});

	app.get('/makeurl', function(req, res){
		registerShortUrl({
			type: 'location',
			dest: req.query["url"]
		}, function(data){
			res.send(data.url + '<br>' + data.index + '<br>' + data.code);
		});
	});

	app.get('/:shortUrl', function(req, res){
		if(config.redis.enabled == false)
		{
			res.send(503);
			return;
		}

		var index = codeToIndex(req.params.shortUrl);
		if(index == 0)
		{
			res.send(404);
			return;
		}

		//shortUrl Processing
		global.redisStore.get('short_url_data:' + index, function(err, data){
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

	function registerShortUrl(data, callback)
	{
		global.redisStore.incr('short_url_index', function(err, index){
			index = Number(index);

			global.redisStore.set('short_url_data:' + index, JSON.stringify(data));

			callback({
				index: index,
				code: indexToCode(index),
				url: 'http://page.bicy.com/' + indexToCode(index)
			});
		});
	}

	function indexToCode(index)
	{
		if(index == 0) return '';

		var ck = checkKey(index);
		var res = '';

		while(index > 0)
		{
			var n = index % 62;
			res+= codeToken[n];;
			index = Math.floor(index / 62);
		}

		return res + ck;
	}

	function codeToIndex(cd)
	{
		if(cd.length < 4) return 0;

		var ck = cd.substring(cd.length, cd.length - 3);
		cd = cd.substr(0, cd.length - 3);
		var index = 0;

		for(var i = 0, j = 1; i < cd.length; i++, j*= 62)
			index+= (code.indexOf(cd.substr(i, 1))) * j;

		if(ck == checkKey(index))
			return index;
		else
			return 0;
	}

	function checkKey(index)
	{
		var prime = config.shortUrl.prime;
		var res = '';

		for(var i = 0; i < 3; i++)
			res+= codeToken[prime[i] * index % 62];

		return res;
	}

	for(var i = 0; i < 62; i++)
		codeToken[i] = code.substr(i, 1);
}