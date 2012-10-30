var express = require('express');
var querystring = require('querystring');
var async = require('async');
var fb = require('fb');
var crypto = require('crypto');

var modules;
var config;
var mysqlClient;

var app = express();
/*

API Reference

[ACCOUNT]
  @ account-register
    - (String) nick        : nick name
    - (String) accesstoken : facebook access token
    - (String) photo       : base64 encoded jpeg file

    # Return
      - (Number) state    : 0(OK) 1(FAILED) 2(FACEBOOK_ERROR)
      - (Number) uniqid   : unique id
      - (String) passkey  : pass key
  ----------------------------------------------------------------------------------------------------------------
  @ account-login
    1. default login
      - (Number) uniqid  : unique id
      - (String) passkey : pass key
    2. facebook login
      - (String) accesstoken : facebook access token

    # Return
      - (Number) state  : 0(OK) 1(FAILED) 2(INVALID_UNIQID) 3(INVALID_PASSKEY) 4(FACEBOOK_ERROR)
      * if state == 0
        - (String) sessid : session id
  ----------------------------------------------------------------------------------------------------------------

  ----------------------------------------------------------------------------------------------------------------
  ----------------------------------------------------------------------------------------------------------------
  ----------------------------------------------------------------------------------------------------------------

*/
var api = {
	'test' : function(arg, cb) {
		var res = {state: 0};
		for(var i in arg)
			res[i] = arg[i];
		setTimeout(function(){cb(res)}, 1000);
	},

	'account-register': function(arg, cb) {
		async.waterfall([
			function(cb) {
				/* check arguments */

				cb(null);
			},

			function(cb) {
				/* register account */

				account.register(null, function(uniqid, passkey) {
					cb(null, uniqid, passkey);
				});
			},

			function(uniqid, passkey, cb) {
				/* link facebook */

				if(!arg.facebook)
					cb(null, uniqid, passkey);

				cb(null);
			}
		],

		function(err, uniqid, passkey) {
			if(err || !uniqid || !passkey)
			{
				cb({
					state: 1
				})
			}
			else
			{
				cb({
					state: 0,
					uniqid: uniqid,
					passkey: passkey
				});
			}
		});
	},

	'account-login': function(arg, cb) {

	}
};

/*

Account Object Reference

1. account.register(argument, callback);
   argument (JSON)     : 
   callback (FUNCTION) : function(uniqId, passKey)

2. account.login(argument, callback);
   argument (JSON)     : 
   callback (FUNCTION) : 

*/
var account = {
	register: function(arg, cb) {
		async.waterfall([
			function(cb) {
				var md5 = crypto.createHash('md5');
				md5.update((new Date).getTime().toString());
				md5.update(Math.random().toString());
				md5.update(Math.random().toString());
				md5.update(Math.random().toString());

				var passkey = md5.digest('hex');

				mysqlClient.query(
					"INSERT INTO `account` SET passkey = ?, facebook = ?, accesstoken = ?",
					[passkey, 0, ''],
					function(err, results, fields) {
						cb(null, passkey);
					}
				);
			},

			function(passkey, cb) {
				mysqlClient.query("SELECT LAST_INSERT_ID() AS `uniqid`", function(err, results, fields) {
					cb(null, results[0].uniqid, passkey);
				});
			}
		],

		function(err, uniqid, passkey) {
			cb(uniqid, passkey);
		});
	},

	login: function(arg, cb) {

	}
};

exports.app = app;
exports.api = api;
exports.ready = function() {
	modules = global.modules;
	config = global.config;
	mysqlClient = global.mysqlClient;

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

3. 
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
