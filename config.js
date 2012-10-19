exports.config = {
	ports: [80, 81, 8080],
	
	hosts: [
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
	],

	redis: {
		enabled: true,
		host: 'localhost',
		port: 6379
	}
};