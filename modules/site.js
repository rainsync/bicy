var express = require('express');
var crypto = require('crypto');
var querystring = require('querystring');
var app = express();

var modules = global.modules;
var config = global.config;

var facebook = modules.facebook;

app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.cookieSession({key: 'test', secret: 'test'}));
app.use(express.compress());
app.use(app.router);

app.use(function(req, res, next){
	if(!req.session.state)
	{
		facebook.uniqId_SHA1(function(uid){
			console.log('set uid', uid);
			req.session.state = uid;

			next();
		});
	}
	else next();
})

app.get('/', function(req, res){
	if(!req.session.visitCount) req.session.visitCount = 0;
	res.send('this page is site <br>visit count ' + (++req.session.visitCount));
});

app.get('/facebook', function(req, res){
	res.statusCode = 302;

	res.header('Location', 'https://www.facebook.com/dialog/oauth?' + querystring.stringify({
		cliend_id: facebook.appId,
		redirect_uri: 'http://bicy.com/facebook',
		state: req.session.state
	}));
	res.end();
});

exports.app = app;

exports.ready = function(){

}