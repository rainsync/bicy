var express = require('express');
var fs = require('fs');
var redis;

var app = express();
var vhost = express();
var modules = [];
var config = require('./config').config;

var ports = config.ports;
var hosts = config.hosts;

//redis initaliz
var redis;
if(config.redis.enabled)
{
	redis = require('redis');
	redis.store = redis.createClient(config.redis.port, config.redis.host);
}

//hosts initializ
for(var i in hosts)
{
	(function(h){
		console.log('host load', h.host);

		if(h.type == 'express')
		{
			h.modulePath = __dirname + '/modules/' + h.moduleName;
			if(h.modulePath.indexOf('.js') == -1) h.modulePath+= '.js';

			if(!modules[h.moduleName])
				process.nextTick(function(){
					fs.watchFile(h.modulePath, function(curr, prev){
						console.log('reload module', h.moduleName);
						try {
							modules[h.moduleName] = require(h.modulePath, true);
						} catch (e) {

						}
					});
				});

			try {
				modules[h.moduleName] = require(h.modulePath);
			} catch (e) {

			}

			app.use(function(req, res, next) {
				if(!modules[h.moduleName]) return next();
				h.hostRegExp = new RegExp('^' + h.host.replace(/[*]/g, '(.*?)') + '$', 'i');
			    if (!req.headers.host) return next();
			    var host = req.headers.host.split(':')[0];
			    if (!h.hostRegExp.test(host)) return next();
			    if ('function' == typeof modules[h.moduleName].app) return modules[h.moduleName].app(req, res, next);
			    modules[h.moduleName].app.emit('request', req, res);
			});
		}
	})(hosts[i]);;
}

process.on('uncaughtException', function (err) {
	console.log('Caught exception ---');
	console.log(err);
	console.log('--------------------');
});

if(Object.prototype.toString.apply(ports) == '[object Array]')
	for(var i in ports)
		app.listen(ports[i]);
else
	app.listen(ports);