var express = require('express');
var querystring = require('querystring');
var app = express();
var api = {
	test : function(arg, callback) {
		var res = {state: 0};
		for(var i in arg)
			res[i] = arg[i];
		setTimeout(function(){callback(res)}, 1000);
	},

	register: function(arg, callback) {
		//arg.name = kadi
		callback({
			yourname : arg.name
		})
	}
};

exports.app = app;
exports.api = api;
exports.ready = function() {
	var modules = global.modules;
	var config = global.config;

	app.use(express.bodyParser());

	app.get('/', function(req, res) {
		res.send('this page is api');
	});

	app.post('/', function(req, res) {
		var parse = JSON.parse(req.body.DATA);

		if(isArray(parse))
		{
			var results = Array();
			var resCount = 0;

			for(var i in parse)
				(function(i){
					if("type" in parse[i] && "function" == typeof api[parse[i].type])
					{
						api[parse[i].type](parse[i], function(result) {
							results[i] = result;
							resCount++;

							if(resCount == parse.length)
								res.send(JSON.stringify(results));
						});
					}
					else
					{
						results[i] = {state: 1, msg: 'INVALID TYPE'};
						resCount++;

						if(resCount == parse.length)
							res.send(JSON.stringify(results));
					}
				})(i);
		}
		else
		{
			var result;

			if("type" in parse && "function" == typeof api[parse.type])
				api[parse.type](parse, function(result) {
					res.send(result);
				});
			else
				res.send({state: 1, msg: 'INVALID TYPE'});
		}
	});

	app.get('/:type', function(req, res) {
		var type = req.params.type;
		var result;

		if("function" == typeof api[type])
			api[type]({}, function(result) {
				res.send(result);
			});
		else
			res.send({state: 1, msg: 'INVALID TYPE'});
	});

	app.get('/:type/:arg', function(req, res) {
		var type = req.params.type;
		var arg = querystring.parse(req.params.arg);
		var result;

		if("function" == typeof api[type])
			api[type](arg, function(result) {
				res.send(result);
			});
		else
			res.send({state: 1, msg: 'INVALID TYPE'});
	});

	/*
	{
		var request = require('request');

		if(0)
		request.post('http://api.bicy.com/', {
			form: {
				DATA: JSON.stringify({type: 'test', name: 'nyj'})
			}
		}, function(err, res, body) {
			console.log(body);
		});

		//if(0)
		request.post('http://api.bicy.com/', {
			form: {
				DATA: JSON.stringify([{type: 'test', no: 1}, {type: 'test', no: 2}, {type: 'test', no: 3}])
			}
		}, function(err, res, body) {
			console.log(body);
		});
	}//*/
}

function isArray(obj)
{
	if(Object.prototype.toString.apply(obj) == '[object Array]')
		return true;
	else
		return false;
}

/*

1.
URL : http://api.bicy.com/profile-change/?photo=123123123

2.
URL : http://api.bicy.com
POST
{
	type: profile-change,
	photo: 123123123
}

1. 
URL : http://api.bicy.com
POST
[{
	type: ...
	text: ...	
},{
	type: ...
	text: ...	
},{
	type: ...
	text: ...	
}]

*/
