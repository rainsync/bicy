eval(global.moduleInit());

/*

Race Object Reference

race.create(uid, callback) - 레이스 생성
race.invite(uid, raceNo, invites, callback) - 레이스 초대
race.join(uid, raceNo, callback) - 레이스 참여
race.participant(raceNo, callback) - 레이스 참가자 목록
race.metadata(uid, raceNo, callback) - 레이스 메타데이터 읽기
race.metadata(uid, raceNo, newInfo) - 레이스 메타데이터 쓰기

record
  race.record.push(uid, raceNo, str) - 위치 정보 넣기
  race.record.range(uid, raceNo, start, end, callback) - 위치 정보 가져오기
  race.record.length(uid, raceNo, callback) - 위치 정보의 갯수

*/

exports.model = {
	create: function(uid, cb) {
		async.waterfall([
			function(cb) {
				mysqlClient.query("INSERT INTO `race` SET `uid` = ?", [uid]);

				mysqlClient.query("SELECT LAST_INSERT_ID() AS `no`", function(err, results, fields) {
					cb(null, results[0].no);
				});
			},

			function(no, cb) {
				race.invite(uid, no, uid, function(err) {
					cb(err, no);
				});
			},

			function(no, cb) {
				race.join(uid, no, function(err) {
					cb(err, no);
				});
			}
		],

		function(err, no) {
			if(err)
				cb(null);
			else if(no)
				cb(no);
		});
	},

	invite: function(uid, raceNo, invites, cb) {
		if(!isArray(invites)) invites = [invites];

		async.waterfall([
			function(cb) {
				/* PERMISSION CHECK */

				if(uid == invites[0])
					cb(null);
				else
					mysqlClient.query(
						"SELECT * FROM `race_participant` WHERE `no` = ? AND `uid` = ?",
						[raceNo, uid],
						function(err, results, fields) {
							if(results)
								cb(null);
							else
								cb('PERMISSION ERROR');
						}
					);
			},

			function(cb) {
				/* INVALID ACCOUNT CHECK */

				mysqlClient.query(
					"SELECT `uid` FROM `account` WHERE `uid` IN (" + invites.join(',') + ")",
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
				);
			},

			function(cb) {
				var values = '';
				for(var i in invites)
					values+= ",('" + [raceNo, uid, invites[i]].join("', '") + "')";
				values = values.substr(1);

				mysqlClient.query(
					"INSERT INTO `race_participant` (`no`, `inviter`, `uid`) VALUES " + values,
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
				);
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

	participant: function(raceNo, cb) {
		mysqlClient.query(
			"SELECT `uid` FROM `race_participant` WHERE `no` = ?",
			[raceNo],
			function(err, results, fields) {
				var res = [];

				for(var i in results)
					res.push(results[i].uid);

				cb(res);
			}
		);
	},

	metadata: function(uid, raceNo) {
		if("function" == typeof arguments[2])
		{ // Get
			var cb = arguments[2];

			redisStore.get(dot('race', raceNo, uid), function(err, res) {
				cb(JSON.parse(res));
			});
		}
		else
		{ // Set
			redisStore.set(dot('race', raceNo, uid), JSON.stringify(arguments[2]));
		}
	},

	record: {
		push: function(uid, raceNo, arg) {
			if(isArray(arg))
				for(var i in arg)
					redisStore.rpush(dot('race', raceNo, uid, 'record'), arg[i]);
			else
				global.redisStore.rpush(dot('race', raceNo, uid, 'record'), arg);
		},

		range: function(uid, raceNo, start, end, cb) {
			redisStore.lrange(dot('race', raceNo, uid, 'record'), start, end, function(err, res) {
				if(err)
					cb(null);
				else
					cb(res);
			});
		},

		length: function(uid, raceNo, cb) {
			redisStore.llen(dot('race', raceNo, uid, 'record'), function(err, res) {
				if(err)
					cb(null);
				else
					cb(res);
			});
		}
	}
};