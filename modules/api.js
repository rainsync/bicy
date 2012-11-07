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
    - (String) picture     : base64 encoded jpeg file

    # Return
      - (Number) state   : 0(OK) 1(FAILED) 2(FACEBOOK_ERROR)
      - (Number) uid     : unique id
      - (String) passkey : pass key
  ----------------------------------------------------------------------------------------------------------------
  @ account-auth
    1. default auth
      - (Number) uid : unique id
      - (String) psk : pass key
    2. facebook auth
      - (String) accesstoken : facebook access token

    # Return
      - (Number) state : 0(OK) 1(FAILED) 2(INVALID_UNIQID) 3(INVALID_PASSKEY) 4(FACEBOOK_ERROR)
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

var api = {
	'account-register': function(arg, cb) {
		async.waterfall([
			function(cb) {
				/* check arguments */

				if(arg.accesstoken)
				{
					account.auth(arg.accesstoken, function(uid) {
						if(uid) {
							account.get(uid, function(usr) {
								cb(1, uid, passkey);
							});
						}
					});
				}

				cb(null);
			},

			function(cb) {
				/* register account */

				account.register(function(uid, passkey) {
					cb(null, uid, passkey);
				});
			},

			function(uid, passkey, cb) {
				/* link facebook */

				if(!arg.accesstoken)
					cb(null, uid, passkey);
				else
					account.facebook.link(uid, arg.accesstoken, function(err) {
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
		function _cb(uid) {
			if(uid)
			{
				account.session.make(uid, function(sid) {
					cb({
						state: 0,
						sessid: sid
					})
				});
			}
			else
				cb({
					state: 1,
					msg: 'LOGIN FAILED'
				})
		}

		if(arg.uid)
			account.auth(arg.uid, arg.psk, _cb);
		else if(arg.accesstoken)
			account.auth(arg.accesstoken, _cb);
	},

	'account-profile-get': function(arg, cb) {
		if(!arg._uid)
		{
			cb({
				state: 1,
				msg: 'SESSION DOES NOT EXIST'
			});

			return;
		}

		account.get(arg._uid, function(usr) {
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
	},

	'account-profile-set': function(arg, cb) {
		if(!arg._uid)
		{
			cb({
				state: 1,
				msg: 'SESSION DOES NOT EXIST'
			});

			return;
		}

		var changes = {};
		var uid = arg._uid;

		for(var i in arg)
		{
			switch(i)
			{
			case 'nick':
			case 'email':
				changes[i] = arg[i];
				break;
			case 'picture':
				var dataBuffer = new Buffer(arg[i], 'base64');

				require("fs").writeFile('./pictures/' + uid + '.jpg', dataBuffer);

				changes.pictureurl = 'http://bicy.kr/pictures/' + uid + '.jpg';
				break;
			}
		}

		account.update(uid, changes);

		cb({
			state: 0
		});
	},

	'account-friend-list': function(arg, cb) {
		if(!arg._uid)
		{
			cb({
				state: 1,
				msg: 'SESSION DOES NOT EXIST'
			});

			return;
		}

		async.waterfall([
			function(cb) {
				account.friend.facebook(arg._uid, function(res) {
					cb(null, res);
				});
			},

			function(res, cb) {
				account.get(res, function(res) {
					var results = [];

					for(var i in res)
					{
						results.push({
							uid: res[i].uid,
							nick: res[i].nick
						});
					}

					cb(null, results);
				});
			}
		],

		function(err, results) {
			cb({
				state: 0,
				friends: results
			})
		});
	},

	'race-create': function(arg, cb) {

	},

	'race-invite': function(arg, cb) {

	},

	'race-join': function(arg, cb) {

	},

	'race-info': function(arg, cb) {

	},

	'race-summary': function(arg, cb) {

	},

	'race-record': function(arg, cb) {

	},
};

/*

Race Object Reference

race.create(uid, callback) - 레이스 생성
race.invite(uid, raceNo, invites, callback) - 레이스 초대
race.join(uid, raceNo, callback) - 레이스 참여
race.metadata(uid, raceNo, callback) - 레이스 메타데이터 읽기
race.metadata(uid, raceNo, newInfo) - 레이스 메타데이터 쓰기

record
  race.record.push(uid, raceNo, str) - 위치 정보 넣기
  race.record.range(uid, raceNo, start, end, callback) - 위치 정보 가져오기
  race.record.length(uid, raceNo, callback) - 위치 정보의 갯수

*/

var race = {
	create: function(uid, cb) {
		async.waterfall([
			function(cb) {
				mysqlClient.query("INSERT INTO `race` SET `uid` = ?", [uid]);

				mysqlClient.query("SELECT LAST_INSERT_ID() AS `no`", function(err, results, fields) {
					cb(null, results[0].no);
				});
			},

			function(no, cb) {
				mysqlClient.query(
					"INSERT INTO `race_participant` SET `uid` = ?",
					[uid, 0, 0],
					function(err, results, fields) {
						cb(null, no);
					}
				);
			}
		],

		function(err, no) {
			race.join(uid, no, function() {
				cb(no);
			});
		});
	},

	invite: function(uid, raceNo, invites, cb) {
		if(!isArray(invites)) invites = [invites];

		async.waterfall([
			function(cb) {
				/* PERMISSION CHECK */

				mysqlClient.query(
					"SELECT * FROM `race_participant` WHERE `no` = ? AND `uid` = ?",
					[raceNo, uid],
					function(err, results, fields) {
						if(results)
							cb(null);
						else
							cb('PERMISSION ERROR');
					}
				)
			},

			function(cb) {
				/* INVALID ACCOUNT CHECK */

				mysqlClient.query(
					"SELECT `uid` FROM `account` WHERE `uid` IN (" + string.join(invites, ',') + ")",
					function(err, results, fields) {
						if(results)
						{
							invites = [];
							for(var i in results)
								invites.push(results[i].uid);

							cb(null);
						}
						else
							cb('INVALID ACCOUNTS');
					}
				)
			},

			function(cb) {
				var values = '';
				for(var i in invites)
					values+= ",('" + string.join([raceNo, uid, invites[i]], "', '") + "')";
				values = values.substr(1);

				mysqlClient.query(
					"INSERT INTO `race_participant` (`no`, `uid`, `inviter`) VALUES " + values,
					function(err, results, fields) {
						cb(null);
					}
				);
			}
		],

		function(err, result) {
			if(err)
				cb(err);
			else
				cb(null);
		});
	},

	join: function(uid, raceNo, cb) {
		async.waterfall([
			function(cb) {
				/* INVITE CHECK */

				mysqlClient.query(
					"SELECT * FROM `race_participant` WHERE `no` = ? AND `uid` = ? AND `state` = '0'",
					[raceNo, uid],
					function(err, results, fields) {
						if(results)
							cb(null);
						else
							cb('INVALID INVITE');
					}
				);
			},

			function(cb) {
				account.update(uid, {raceno: raceNo});

				mysqlClient.query(
					"UPDATE `race_participant` SET `state` = '1' WHERE `no` = ?, `uid` = ? ",
					[raceNo, uid],
					function(err, results, fields) {
						cb(null);
					}
				)
			},

			function(cb) {
				var metadata = {

				};

				global.redisStore.set(dot('race', raceNo, uid), JSON.stringify(metadata));

				cb(null);
			}
		],

		function(err) {
			if(err)
				cb(err);
			else
				cb(null);
		});
	},

	metadata: function(uid, raceNo) {
		if("function" == typeof arguments[2])
		{ // Get
			var cb = arguments[2];

			global.redisStore.get(dot('race', raceNo, uid), function(err, res) {
				cb(JSON.parse(res));
			});
		}
		else
		{ // Set
			global.redisStore.set(dot('race', raceNo, uid), arguments[2]);
		}
	},

	record: {
		push: function(uid, raceNo, arg) {
			if(isArray(arg))
				for(var i in arg)
					global.redisStore.rpush(dot('race', raceNo, uid, 'record'), arg[i]);
			else
				global.redisStore.rpush(dot('race', raceNo, uid, 'record'), arg);
		},

		range: function(uid, raceNo, start, end, cb) {
			global.redisStore.lrange(dot('race', raceNo, uid, 'record'), start, end, function(err, res) {
				if(err)
					cb(null);
				else
					cb(res);
			});
		},

		length: function(uid, raceNo, cb) {
			global.redisStore.llen(dot('race', raceNo, uid, 'record'), function(err, res) {
				if(err)
					cb(null);
				else
					cb(res);
			});
		}
	}
};

/*

Account Object Reference

account.get(uid, callback) - 해당 uid의 정보를 데이터베이스에 요청하여 가져옴
account.update(uid, changes) - 해당 uid의 정보를 업데이트
account.register(argument, callback) - 계정 만들기

facebook
  account.facebook.link(argument, callback) - 페이스북과 계정 연동
  account.facebook.friend(argument, callback) - 페이스북에서 친구 목록 가져옴
  account.facebook.picture(uid, accesstoken, callback) - 페이스북에서 사진 가져옴

session
  account.session.get(sid, callback) - 세션 아이디에서 uid를 얻어옴
  account.session.make(uid, callback) - uid가 담긴 세션을 만듬
  account.session.auth(uid, passkey, callback) - uid, passkey가 유효한지 확인한다
  account.session.facebook(accesstoken, callback) - 페이스북에 해당 계정과 연동된 uid를 반환한

*/
var account = {
	get: function(uid, cb) {
		var uids;
		if(!isArray(uid)) uids = [uid];
		else uids = uid;

		var results = [];
		var fails = [];
		var funcs = [];

		for(var i in uids)	
			(function(i){
				funcs.push(function(cb) {
					global.redisStore.get('cache.account.' + uids[i], function(err, data) {
						if(data)
						{
							results.push(JSON.parse(data));
							cb(null);
						}
						else
						{
							fails.push(uids[i]);
							cb(null);
						}
					});
				});
			})(i);

		async.parallel(funcs, function(err, res) {
			if(fails.length > 0)
			{
				mysqlClient.query(
					"SELECT * FROM `account` WHERE `uid` IN (" + fails.join() +")",
					function(err, res, fields) {
						if(res)
						{
							for(var i in res)
							{
								results.push(res[i]);
								global.redisStore.set('cache.account.' + res[i].uid, JSON.stringify(res[i]));
							}
							cb(isArray(uid)?results:results[0]);
						}
						else
							cb(null);
					}
				);
			}
			else cb(isArray(uid)?results:results[0]);
		});
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

		global.redisStore.del('cache.account.' + uid);
	},

	register: function(cb) {
		var md5 = crypto.createHash('md5');
		md5.update((new Date).getTime().toString());
		md5.update(Math.random().toString());
		md5.update(Math.random().toString());
		md5.update(Math.random().toString());

		var passkey = md5.digest('hex');

		mysqlClient.query(
			"INSERT INTO `account` SET passkey = ?",
			[passkey]
		);

		mysqlClient.query("SELECT LAST_INSERT_ID() AS `uid`", function(err, results, fields) {
			cb(results[0].uid, passkey);
		});
	},

	auth: function() {
		if(arguments.length == 3)
		{ // uid & passkey
			var uid = arguments[0];
			var passkey = arguments[1];
			var cb = arguments[2];

			mysqlClient.query(
				"SELECT `uid` FROM `account` WHERE `uid` = ? AND `passkey` = ?",
				[uid, passkey],
				function(err, results, fields) {
					if(results.length > 0)
						cb(uid);
					else
						cb(null);
				}
			);
		}
		else if(arguments.length == 2)
		{ // facebook
			var accesstoken = arguments[0];
			var cb = arguments[1];

			async.waterfall([
				function(cb) {
					mysqlClient.query(
						"SELECT `uid` FROM `account` WHERE `accesstoken` = ?",
						[accesstoken],
						function(err, results, fields) {
							if(results.length > 0)
								cb(null, results[0].uid);
							else
								cb(null);
						}
					);
				},

				function(uid, cb) {
					if(uid)
					{
						cb(null, uid);
						return;
					}

					fb.api('me', {access_token: accesstoken, fields: ['id']}, function(res) {
						if(res.id)
						{
							mysqlClient.query(
								"SELECT `uid` FROM `account` WHERE `fbid` = ?",
								[res.id],
								function(err, results, fields) {
									if(results.length > 0)
										cb(null, results[0].uid);
									else
										cb(null);
								}
							);
						}
					});
				}
			],

			function(err, uid) {
				if(err)
					cb(null);
				else
					cb(uid);
			});
		}
	},

	friend: {
		facebook: function(uid, cb) {
			mysqlClient.query(
				"SELECT `account`.`uid` FROM `fb_friends` " +
				"INNER JOIN `account` ON (`fb_friends`.`fbid` = `account`.`fbid`) " +
				"WHERE `fb_friends`.`uid` = ? ",
				[uid],
				function(err, results, fields) {
					if(results)
					{
						var res = [];
						for(var i in results)
							res.push(results[i].uid);
						cb(res);
					}
					else cb(null);
				}
			);
		}
	},

	session: {
		get: function(sid, cb) {
			global.redisStore.get('session:' + sid, function(err, data) {
				if(data)
				{
					var parse = JSON.parse(data);
					account.get(parse.uid, function(usr) {
						cb(usr);
					});
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

		/*auth: function(uid, passkey, cb) {
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
		}*/
	},

	facebook: {
		link: function(uid, accesstoken, cb) {
			async.waterfall([
				function(cb) {
					/* check account */

					mysqlClient.query(
						"SELECT `accesstoken` FROM `account` WHERE `uid` = ?",
						[uid],
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

					fb.api('me', {access_token: accesstoken, fields: ['id', 'name', 'email', 'picture', 'updated_time']}, function(res) {
						cb(null, res);

						account.facebook.friend(uid, accesstoken);
						account.facebook.picture(uid, accesstoken);
					});

				},

				function(data, cb) {
					account.update(uid, {
						fbid: data.id,
						accesstoken: accesstoken,
						nick: data.name,
						email: data.email
					});

					cb(null);
				}
			],

			function(err) {
				cb(null);
			});
		},

		friend: function(uid, accesstoken, cb) {
			fb.api('me/friends', {access_token: accesstoken}, function(res) {
				mysqlClient.query(
					"DELETE FROM `fb_friends` WHERE `uid` = ?",
					[uid]
				);

				var values = '';
				for(var i in res.data)
					values+= ",('" + uid + "','" + res.data[i].id + "')";
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

			account.update(uid, {
				pictureurl: uploadUrl
			})
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
		function call() {
			api[name](arg, function(result) {
				cb(result);
			});
		}

		for(var i in arg)
			if(i.substr(0, 1) == '_')
				delete arg[i];

		if(arg.sid)
		{
			account.session.get(arg.sid, function(usr) {
				if(usr == null)
					cb({
						state: 1,
						msg: 'SESSION DOES NOT EXISTs'
					});
				else
				{
					arg._uid = usr.uid;
					arg._usr = usr;
					call();
				}
			});
		}
		else call();
	}

	app.use(express.bodyParser());

	app.use(function(req, res, next) {
		res.header('Content-Type', 'application/json');
		next();
	});

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

function dot() {
	var res = '';
	for(var i in arguments)
		res+= '.' + arguments[i];
	return res.substr(1);
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
