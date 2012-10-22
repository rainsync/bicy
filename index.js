var express = require('express');
var fs = require('fs');
var config = require('./config').config;

var redis;
var app = express();
var vhost = express();
var modules = {};

require.modules = modules;

//redis initalize
var redis;
if(config.redis.enabled)
{
	redis = require('redis');
	redis.store = redis.createClient(config.redis.port, config.redis.host);
}

//hosts initialize
for(var i in config.modules)
{
	modules[config.modules[i].name] = {};

	(function(info, module){
		console.log('load module', info.name);

		var path = __dirname + '/modules/' + info.name;
		if(path.indexOf('.js') == -1) path+= '.js';

		try {
			module = require(path);
		} catch (e) {

		}

		fs.watchFile(path, function(curr, prev){
			console.log('reload module', info.name);
			try {
				delete require.cache[path];
				module = require(path, true);
			} catch (e) {

			}
		});

		if(info.type == 'express')
		{
			function vhost(host){
				var hostRegExp = new RegExp('^' + host.replace(/[*]/g, '(.*?)') + '$', 'i');

				return function(req, res, next){
				    if (!req.headers.host) return next();
				    var host = req.headers.host.split(':')[0];
				    if (!hostRegExp.test(host)) return next();
				    if ('function' == typeof module.app) return module.app(req, res, next);
				    module.app.emit('request', req, res);
				}
			}

			if(isArray(info.host) == true)
				for(var i in info.host)
					app.use(vhost(info.host[i]));
			else
				app.use(vhost(info.host));
		}
		else if(info.type == 'extension')
		{

		}
	})(config.modules[i], modules[config.modules.name]);;
}

process.on('uncaughtException', function (err) {
	console.log('Caught exception -------------------------------');
	console.log(err);
	console.log('------------------------------------------------');
});

if(isArray(config.ports) == true)
	for(var i in config.ports)
		app.listen(config.ports[i]);
else
	app.listen(config.ports);


function isArray(obj)
{
	if(Object.prototype.toString.apply(obj) == '[object Array]')
		return true;
	else
		return false;	
}