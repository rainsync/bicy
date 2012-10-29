var express = require('express');
var fs = require('fs');
var config = require('./config');

var redis;
var app = express();
var vhost = express();
var modules = {};
var redisStore;
var mysqlClient;

global.modules = modules;
global.config = config;

//redis initalize
var redis;
if(config.redis.enabled)
{
	redis = require('redis');

	redisStore = redis.createClient(config.redis.port, config.redis.host);
	global.redisStore = redisStore;
}

var mysql;
if(config.mysql.enabled)
{
	mysql = require('mysql');

	mysqlClient = mysql.createClient({
		host     : config.mysql.host || 'localhost',
		port     : config.mysql.port || 3306,
		user     : config.mysql.user,
		password : config.mysql.password
	});

	mysqlClient.query('USE ' + config.mysql.database);

	setInterval(function(){
		mysqlClient.ping();
	}, 30000);

	global.mysqlClient = mysqlClient;
}

//hosts initialize
for(var i in config.modules)
{
	modules[config.modules[i].name] = {};

	(function(info){
		var module;
		console.log('load module', info.name);

		var path = __dirname + '/modules/' + info.name;
		if(path.indexOf('.js') == -1) path+= '.js';

		try {
			module = require(path);
		} catch (e) {

		} finally {
			if(module) console.log('....OK!');
			else console.log('....ERROR');
		}

		fs.watchFile(path, function(curr, prev){
			console.log('reload module', info.name);
			try {
				delete require.cache[path];
				module = require(path, true);
			} catch (e) {

			} finally {
				if(module)
				{
					module.ready();
					console.log('....OK!');
				}
				else console.log('....ERROR');
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

		modules[info.name] = module;
	})(config.modules[i]);
}

for(var i in modules)
	modules[i].ready();

process.on('uncaughtException', function (err) {
	console.log('uncaught exception -------------------------------');
	console.log(err.stack);
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