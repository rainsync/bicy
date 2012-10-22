exports.config = {
	ports: [80, 81, 8080],
	
	modules: [
		{
			name: 'example',
			type: 'express',
			host: 'example.bicy.com'
		},
		{
			name: 'site',
			type: 'express',
			host: ['bicy.com', 'www.bicy.com']
		},
		{
			name: 'page',
			type: 'express',
			host: 'page.bicy.com'
		},
		{
			name: 'api',
			type: 'express',
			host: 'api.bicy.com'
		},
		{
			name: 'facebook',
			type: 'extension'
		}
	],
	
	redis: {
		enabled: false,
		host: 'localhost',
		port: 6379
	},

	shortUrl: {
		base62code: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
		prime: [7, 21, 47];
	}
};