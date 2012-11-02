var express = require('express');
var querystring = require('querystring');
var async = require('async');
var fb = require('fb');
var crypto = require('crypto');
var request = require('request');
var fs = require('fs');

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
    - (String) picture      : base64 encoded jpeg file

    # Return
      - (Number) state    : 0(OK) 1(FAILED) 2(FACEBOOK_ERROR)
      - (Number) uid   : unique id
      - (String) passkey  : pass key
  ----------------------------------------------------------------------------------------------------------------
  @ account-auth
    1. default auth
      - (Number) uid  : unique id
      - (String) psk : pass key
    2. facebook auth
      - (String) accesstoken : facebook access token

    # Return
      - (Number) state  : 0(OK) 1(FAILED) 2(INVALID_UNIQID) 3(INVALID_PASSKEY) 4(FACEBOOK_ERROR)
      * if state == 0
        - (String) sid : session id
  ----------------------------------------------------------------------------------------------------------------
  @ account-profile-get
    - (String) sid    : session id
    - (String) fields : (EXAM) email,picture,nick
  ----------------------------------------------------------------------------------------------------------------
  ----------------------------------------------------------------------------------------------------------------
  ----------------------------------------------------------------------------------------------------------------

*/
var stateCode = {
	OK: 0
}

var api = {
	'account-register': function(arg, cb) {
		async.waterfall([
			function(cb) {
				/* check arguments */

				cb(null);
			},

			function(cb) {
				/* register account */

				account.register(null, function(uid, passkey) {
					cb(null, uid, passkey);
				});
			},

			function(uid, passkey, cb) {
				/* link facebook */

				if(!arg.accesstoken)
					cb(null, uid, passkey);
				else
					account.facebook.link({
						uid: uid,
						accesstoken: arg.accesstoken
					}, function(err) {
						if(err)
							cb(err);
						else
							cb(null, uid, passkey);
					});
			}
		],

		function(err, uid, passkey) {
			if(err || !uid || !passkey)
			{
				cb({
					state: 1,
					msg: err
				})
			}
			else
			{
				cb({
					state: 0,
					uid: uid,
					passkey: passkey
				});
			} 
		});
	},

	'account-linked-facebook': function(arg, cb) {

	},

	'account-auth': function(arg, cb) {
		function _cb(sid) {
			if(sid)
				cb({
					state: 0,
					sessid: sid
				})
			else
				cb({
					state: 1,
					msg: 'LOGIN FAILED'
				})
		}

		if(arg.uid)
			account.session.auth(arg.uid, arg.psk, _cb);
		else if(arg.accesstoken)
			account.session.facebook(arg.accesstoken, _cb);
	},

	'account-profile-get': function(arg, cb) {
		if(!arg.sid)
		{
			cb({
				state: 1,
				msg: 'SESSION DOES NOT EXIST'
			});

			return;
		}

		async.waterfall([
			function(cb) {
				account.session.get(arg.sid, function(uid) {
					if(uid == null)
						cb({
							state: 1,
							msg: 'SESSION DOES NOT EXIST'
						});
					else
						cb(null, uid);
				});
			},

			function(uid, cb) {
				account.get(uid, function(usr) {
					if(usr)
					{
						if(!arg.fields)
							arg.fields = 'nick,email,picture';

						var fields = arg.fields.split(',');
						var results = {state: 0};
						
						for(var i in fields)
						{
							switch(fields[i])
							{
							case 'nick':
								results.nick = usr.nick;
								break;
							case 'picture':
								results.picture = usr.pictureurl;
								break;
							case 'email':
								results.email = usr.email;
								break;
							}
						}

						cb(results);
					}
					else
						cb({
							state: 1,
							msg: 'ACCOUNT ERROR'
						})
				});
			}
		],

		function(err, results) {
			if(err)
				cb(err);
			else
				cb(results);
		});
	},

	'account-profile-set': function(arg, cb) {
		if(!arg.sid)
		{
			cb({
				state: 1,
				msg: 'SESSION DOES NOT EXIST'
			});

			return;
		}

		async.waterfall([
			function(cb) {
				account.session.get(arg.sid, function(uid) {
					if(uid == null)
						cb({
							state: 1,
							msg: 'SESSION DOES NOT EXIST'
						});
					else
						cb(null, uid);
				});
			},

			function(uid, cb) {
				var changes = {};

				for(var i in arg)
				{
					switch(i)
					{
					case 'nick':
					case 'email':
						changes[i] = arg[i]
						break;
					case 'picture':
						break;
					}
				}

				account.update(uid, changes);

				cb(null, {
					state: 0
				});
			}
		],

		function(err, results) {
			if(err)
				cb(err);
			else
				cb(results);
		});
	}
};

/*

Account Object Reference

account.register(argument, callback);
  argument (JSON)     : 
  callback (FUNCTION) : function(uniqId, passKey)

account.auth(argument, callback);
  argument (JSON)     : 
  callback (FUNCTION) : 

facebook
  account.facebook.link(argument, callback)
    argument (JSON)     : 
    callback (FUNCTION) : 

*/
var account = {
	get: function(uid, cb) {
		mysqlClient.query(
			"SELECT * FROM `account` WHERE `uid` = ?",
			[uid],
			function(err, results, fields) {
				if(results.length > 0)
					cb(results[0]);
				else
					cb(null);
			}
		);
	},

	update: function(uid, changes) {
		var sets = '';

		for(var i in changes)
			sets+= ', `' + i + '` = \'' + changes[i] + '\'';

		sets = sets.substr(1);

		mysqlClient.query(
			"UPDATE `account` SET" + sets + " WHERE `uid` = ?",
			[uid]
		);
	},

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
					"INSERT INTO `account` SET passkey = ?",
					[passkey],
					function(err, results, fields) {
						cb(null, passkey);
					}
				);
			},

			function(passkey, cb) {
				mysqlClient.query("SELECT LAST_INSERT_ID() AS `uid`", function(err, results, fields) {
					cb(null, results[0].uid, passkey);
				});
			}
		],

		function(err, uid, passkey) {
			cb(uid, passkey);
		});
	},

	session: {
		get: function(sid, cb) {
			global.redisStore.get('session:' + sid, function(err, data) {
				if(data)
				{
					var parse = JSON.parse(data);
					cb(parse.uid);
				}
				else
				{
					cb(null);
				}
			});
		},

		make: function(uid, cb) {
			function makeSessionId()
			{
				var md5 = crypto.createHash('md5');
				md5.update((new Date).getTime().toString());
				md5.update(Math.random().toString());
				md5.update(Math.random().toString());
				md5.update(Math.random().toString());

				var sid = md5.digest('hex');

				global.redisStore.get('session:' + sid, function(err, data) {
					if(data == null)
					{
						cb(sid);

						global.redisStore.set('session:' + sid, JSON.stringify({
							uid: uid
						}));
					}
					else
						makeSessionId();
				});
			}

			makeSessionId();
		},

		auth: function(uid, passkey, cb) {
			mysqlClient.query(
				"SELECT `uid` FROM `account` WHERE `uid` = ? AND `passkey` = ?",
				[uid, passkey],
				function(err, results, fields) {
					if(results.length > 0)
						account.session.make(uid, cb);
					else
						cb(null);
				}
			);
		},

		facebook: function(accesstoken, cb) {
			fb.api('me', {access_token: accesstoken, fields: ['id']}, function(res) {
				if(res.id)
				{
					mysqlClient.query(
						"SELECT `uid` FROM `account` WHERE `fbid` = ?",
						[res.id],
						function(err, results, fields) {
							if(results.length > 0)
								account.session.make(results[0].uid, cb);
							else
								cb(null);
						}
					);
				}
			});
		}
	},

	facebook: {
		/*
		  [account.facebook.link]
		   arg.uid
		   arg.accesstoken
		*/
		link: function(arg, cb) {
			async.waterfall([
				function(cb) {
					/* check account */

					mysqlClient.query(
						"SELECT `accesstoken` FROM `account` WHERE `uid` = ?",
						[arg.uid],
						function(err, results, fields) {
							if(results.length != 1)
								cb(1);
							else if(results[0].facebook == 1)
								cb(2);
							else
								cb(null);
						}
					);
				},

				function(cb) {
					/* get facebook data */

					fb.api('me', {access_token: arg.accesstoken, fields: ['id', 'name', 'email', 'picture', 'updated_time']}, function(res) {
						cb(null, res);

						account.facebook.friend(arg);
						account.facebook.picture(arg.uid, arg.accesstoken);
					});

				},

				function(data, cb) {
					mysqlClient.query(
						"UPDATE `account` " +
						"SET `fbid` = ?, `accesstoken` = ?, `nick` = ?, `email` = ?" +
						"WHERE `uid` = ?",
						[data.id, arg.accesstoken, data.name, data.email, arg.uid]
					);

					cb(null);
				}
			],

			function(err) {
				cb(null);
			});
		},

		/*
		  [account.facebook.friend]
		   arg.uid
		   arg.accesstoken
		*/
		friend: function(arg, cb) {
			fb.api('me/friends', {access_token: arg.accesstoken}, function(res) {
				mysqlClient.query(
					"DELETE FROM `fb_friends` WHERE `uid` = ?",
					[arg.uid]
				);

				var values = '';
				for(var i in res.data)
					values+= ",('" + arg.uid + "','" + res.data[i].id + "')";
				values = values.substr(1);

				mysqlClient.query(
					"INSERT INTO `fb_friends` (`uid`, `fbid`) VALUES " + values
				);
			});
		},

		picture: function(uid, accesstoken, cb) {
			var filename = uid;
			var url  = 'https://graph.facebook.com/me/picture?type=large&access_token=' + accesstoken;
			var path = './pictures/' + filename + '.jpg';
			var uploadUrl = 'http://bicy.kr/pictures/' + filename + '.jpg';

			request(url).pipe(fs.createWriteStream(path));

			mysqlClient.query("UPDATE `account` SET `pictureurl` = ? WHERE `uid` = ?", [uploadUrl, uid]);
		}
	}
};

exports.app = app;
exports.api = api;
exports.ready = function() {
	modules = global.modules;
	config = global.config;
	mysqlClient = global.mysqlClient;

	function apiCall(name, arg, cb) {
		api[name](arg, function(result) {
			cb(result);
		});
	}

	app.use(express.bodyParser());

	app.get('/', function(req, res) {
		res.send('this page is api');
	});

	app.post('/', function(req, res) {
		var parse = req.body;

		if(isArray(parse))
		{
			var results = Array();
			var resCount = 0;

			for(var i in parse)
			{
				if(i == 0 && !("type" in parse[i]))
				{
					for(var j in parse)
						for(var k in parse[i])
							parse[j][k] = parse[i][k];

					results[i] = {state: 0};
				}

				(function(i){
					if("type" in parse[i] && "function" == typeof api[parse[i].type])
					{
						apiCall(parse[i].type, parse[i], function(result) {
							results[i] = result;
							resCount++;

							if(resCount == parse.length)
								res.send(JSON.stringify(results));
						});
					}
					else if(i > 0)
					{
						results[i] = {state: 1, msg: 'INVALID TYPE'};
						resCount++;

						if(resCount == parse.length)
							res.send(JSON.stringify(results));
					}
				})(i);
			}
		}
		else
		{
			var result;

			if("type" in parse && "function" == typeof api[parse.type])
				apiCall(parse.type, parse, function(result) {
					res.send([result]);
				});
			else
				res.send([{state: 1, msg: 'INVALID TYPE'}]);
		}
	});

	app.get('/:type', function(req, res) {
		var type = req.params.type;
		var result;

		if("function" == typeof api[type])
			apiCall(type, {}, function(result) {
				res.send(result);
			});
		else
			res.send([{state: 1, msg: 'INVALID TYPE'}]);
	});

	app.get('/:type/:arg', function(req, res) {
		var type = req.params.type;
		var arg = querystring.parse(req.params.arg);
		var result;

		if("function" == typeof api[type])
			apiCall(type, arg, function(result) {
				res.send(result);
			});
		else
			res.send([{state: 1, msg: 'INVALID TYPE'}]);
	});
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
URL : http://api.bicy.com/profile-change/?picture=123123123

2.
URL : http://api.bicy.com
POST
DATA=JSON.stringify({
	type: profile-change,
	picture: 123123123
})

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
