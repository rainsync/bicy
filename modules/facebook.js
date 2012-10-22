var fb = require('fb');
var crypto = require('crypto');
var redis = require('redis');

var modules = global.modules;
var config = global.config;

var appId = config.facebook.appId;
var appSecret = config.facebook.appSecret;

exports.test = function(){
	return 'testzz';
}

function uniqId(callback) {
	redis.store.incr('unique_id_' + config.facebook.uniqIdKey, function(err, uid){
		uid = config.facebook.uniqIdKey + '_' + uid;
		callback(uid);
	});
}

var uniqId_SHA1 = function(callback){
	uniqId(function(uid){
		var shasum = crypto.createHash('sha1');
		shasum.update(uid);
		callback(shasum.digest('hex'));
	});
}

exports.fb = fb;
exports.appId = appId;
exports.appSecret = appSecret;
exports.uniqId = uniqId;
exports.uniqId_SHA1 = uniqId_SHA1;