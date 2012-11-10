eval(global.moduleInit());

var app = express();

exports.app = app;
exports.ready = function() {
	app.configure(function() {
		app.use(express.bodyParser());
		app.use(express.methodOverride());
		app.use(express.cookieParser());
		app.use(express.cookieSession({key: 'test', secret: 'test'}));
		app.use(express.compress());
		app.use(app.router);
	});

	app.use(function(req, res, next) {
		if(!req.session.state)
		{
			uniqId_MD5(function(uid){
				console.log('set uid', uid);
				req.session.state = uid;

				next();
			});
		}
		else next();
	});

	app.get('/', function(req, res) {
		if(!req.session.visitCount) req.session.visitCount = 0;
		res.send('this page is site <br>' + 
			'visit count ' + (++req.session.visitCount) + '<br>' +
			'facebook access token ' + req.session.accessToken);
	});

	app.get('/friends', function(req, res) {
		console.log(req.session.accessToken);

		fb.setAccessToken(req.session.accessToken);
		fb.api('/me', {fields: ['id', 'name', 'link', 'updated_time', 'friends', 'picture']}, function(resp) {
			res.send(resp);
		});
	});

	app.get('/auth/facebook', function(req, res) {
		if(req.query["code"])
		{
			request({
				uri: "https://graph.facebook.com/oauth/access_token?" + querystring.stringify({
					client_id: config.facebook.appId,
					redirect_uri: 'http://bicy.com/auth/facebook',
					client_secret: config.facebook.appSecret,
					code: String(req.query["code"])
				})
			}, function(err, resp, body) {
				var parse = querystring.parse(body);
				req.session.accessToken = parse.access_token;

				res.statusCode = 302;
				res.header('Location', '/');
				res.end();
			});
		}
		else
		{
			res.statusCode = 302;
			res.header('Location', 'https://www.facebook.com/dialog/oauth?' + querystring.stringify({
				client_id: config.facebook.appId,
				redirect_uri: 'http://bicy.com/auth/facebook',
				state: req.session.state,
				scope: 'email,user_birthday,read_stream'
			}));
			res.end();
		}
	});

	function uniqId(callback) {
		global.redisStore.incr('unique_id_' + config.facebook.uniqIdKey, function(err, uid){
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

	var uniqId_MD5 = function(callback){
		uniqId(function(uid){
			var shasum = crypto.createHash('md5');
			shasum.update(uid);
			callback(shasum.digest('hex'));
		});
	}
}