module.exports = {
    ports: [80, 81, 8080],
    
    modules: [
        {
            name: 'site',
            type: 'express',
            host: 'bicy.com'
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
            name: 'account',
            type: 'model'
        },
        {
            name: 'race',
            type: 'model'
        }
    ],

    autoRequire: [
        'express',
        'querystring',
        'async',
        'fb',
        'crypto',
        'request',
        'fs',
    ],

    redis: {
        enabled: true,
        host: 'localhost',
        port: 6379
    },

    mysql: {
        enabled: true,
        host: 'localhost',
        user: 'bicy',
        password: '',
        database: 'bicy'
    },

    shortUrl: {
        base62code: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        prime: [7, 21, 47];
    },

    facebook: {
        appId: '',
        appSecret: ''
    }
};