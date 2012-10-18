var express = require('express');
var fs = require('fs');

var app = express();
var vhost = express();

var ports = [80, 81, 8080];
var hosts = [
	{
		name: 'example',
		host: 'example.bicy.com',
		type: 'express',
		moduleName: 'example'
	},
	{
		name: 'site',
		host: 'www.bicy.com',
		type: 'express',
		moduleName: 'site'
	},
	{
		name: 'site',
		host: 'bicy.com',
		type: 'express',
		moduleName: 'site'
	},
	{
		name: 'page',
		host: 'page.bicy.com',
		type: 'express',
		moduleName: 'page'
	},
	{
		name: 'api',
		host: 'api.bicy.com',
		type: 'express',
		moduleName: 'api'
	}
];
var modules = [];

for(var i in hosts)
{
	(function(h){
		console.log('host load', h.host);

		if(h.type == 'express')
		{
			if(!modules[h.moduleName])
				process.nextTick(function(){
					fs.watchFile(modules[h.moduleName].filename, function(curr, prev){
						console.log('reload module', h.moduleName);
						if(modules[h.moduleName]) delete require.cache[modules[h.moduleName].filename];
						modules[h.moduleName] = require('./modules/' + h.moduleName, true);
					});
				});

			modules[h.moduleName] = require('./modules/' + h.moduleName);

			app.use(function(req, res, next) {
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

if(Object.prototype.toString.apply(ports) == '[object Array]')
	for(var i in ports)
		app.listen(ports[i]);
else
	app.listen(ports);