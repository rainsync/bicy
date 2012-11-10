eval(global.moduleInit());

var app = express();
/*

API Reference

[ACCOUNT]
  @ account-register
    1. facebook register
    - (String) accesstoken : facebook access token

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
      {
      	state,
      	sid: (session id)
      }
  ----------------------------------------------------------------------------------------------------------------
  @ account-profile-get
    - (String) sid    : session id
    - (String) fields : (EXAM) email,picture,nick
  ----------------------------------------------------------------------------------------------------------------
  @ account-profile-set
    - (String) nick
    - (String) email

    # Return
      {
	    state
      }
  ----------------------------------------------------------------------------------------------------------------
  @ account-friend-list
    - (String) sid : session id

    # Return
      {
	    state,
	    friends: [{uid, nick}...]
      }
  ----------------------------------------------------------------------------------------------------------------
  @ race-create
    # Return
      {
	    state,
	    no: (race no)
      }
  ----------------------------------------------------------------------------------------------------------------
  @ race-invite
    - (String) sid     : session id
    - (Number) targets : target uid
    - (Array) targets  : many of target uid (array type)
  ----------------------------------------------------------------------------------------------------------------
  @ race-join
    - (String) sid : session id
    - (Number) no  : race no
  ----------------------------------------------------------------------------------------------------------------
  @ race-summary
    - (String) sid : session id
  ----------------------------------------------------------------------------------------------------------------
  @ race-record
    - (String) sid  : session id
    - (String) data : record data
  ----------------------------------------------------------------------------------------------------------------
  @ cache-clear
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
								cb({
									state: 0,
									uid: uid,
									passkey: usr.passkey
								});
							});
						}
					});
				}
				else cb(null);
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
			if(err)
			{
				cb(err);
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
					});
				});
			}
			else
				cb({
					state: 1,
					msg: 'LOGIN FAILED'
				});
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
				});
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
			});
		});
	},

	'race-create': function(arg, cb) {
		async.waterfall([
			function(cb) {
				if(arg._usr.raceno == 0)
					cb(null);
				else
					cb(true);
			},

			function(cb) {
				race.create(arg._uid, function(no) {
					if(no)
						cb(null, {
							state: 0,
							no: no
						});
					else
						cb(true);
				});
			}
		],

		function(err, results) {
			if(err)
				cb({
					state: 1,
					msg: 'ALREADY RACE'
				});
			else
				cb(results);
		});
	},

	'race-invite': function(arg, cb) {
		race.invite(arg._uid, arg._usr.raceno, arg.targets, function(err) {
			if(err)
				cb({
					state: 1,
					msg: err
				});
			else
				cb({
					state: 0
				});
		});
	},

	'race-join': function(arg, cb) {
		race.join(arg._uid, arg.no, function(err) {
			if(err)
				cb({
					state: 1,
					msg: err
				});
			else
				cb({
					state: 0
				});
		});
	},

	'race-info': function(arg, cb) {

	},

	'race-summary': function(arg, cb) {
		var metadata, funcs;

		async.parallel({
			metadata: function(cb) {
				race.metadata(arg._uid, arg.no, function(metadata) {
					cb(null, metadata);
				});
			},

			participant: function(cb) {
				race.participant(arg.no, function(participant) {
					cb(null, participant);
				});
			}
		},

		function(err, results) {
			funcs = {};
			metadata = results.metadata;

			for(var i in results.participant)
			{
				if(results.participant[i] != arg._uid)
				{
					(function(uid){
						funcs[uid] = function(cb) {
							if("undefined" == typeof metadata.last) metadata.last = {};
							if("undefined" == typeof metadata.last[uid]) metadata.last[uid] = 0;

							async.waterfall([
								function(cb) {
									race.record.length(uid, arg.no, function(length) {										if(length > metadata.last[uid])
											cb(null, length);
										else
											cb(true);
									});
								},

								function(length, cb) {
									race.record.range(uid, arg.no, metadata.last[uid], length, function(res) {
										cb(null, res);
									});

									metadata.last[uid] = length;
								}
							],

							function(err, results) {
								if(err)
									cb(null);
								else
									cb(null, results);
							});
						};
					})(results.participant[i]);
				}
			}

			async.parallel(funcs, function(err, results) {
				race.metadata(arg._uid, arg.no, metadata);
				results.state = 0;
				cb(results);
			});
		});
	},

	'race-record': function(arg, cb) {
		race.record.push(arg._uid, arg._usr.raceno, arg.pos);

		cb({
			state: 0
		});
	},

	'cache-clear': function(arg, cb) {
		redisStore.keys('cache.*', function(err, res) {
			for(var i in res)
				redisStore.del(res[i]);
		});

		cb({
			state: 0
		});
	},
};

exports.app = app;
exports.api = api;
exports.ready = function() {
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
};
