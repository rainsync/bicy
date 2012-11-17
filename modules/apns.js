eval(global.moduleInit());

var apns = apn;
var apnsOption;

exports.model = {
    device: function(token) {
        return new apns.Device(token);
    },

    notification: function(device, arg) {
        var apnsConnection = new apns.Connection(apnsOptions);
        var note = new apns.Notification();

        note.expiry = Math.floor(Date.now() / 1000) + (arg.expiry ? arg.expiry : 3600);
        note.badge = arg.badge ? arg.badge : 3;
        note.sound = arg.sound ? (arg.sound + '.aiff') : 'ping.aiff';
        note.alert = arg.alert;
        note.payload = arg.payload;
        note.device = device;

        apnsConnection.sendNotification(note);
    }
};

exports.ready = function() {
    apnsOptions = {
        cert: config.apns.cert,                 /* Certificate file path */
        certData: null,                   /* String or Buffer containing certificate data, if supplied uses this instead of cert file path */
        key: config.apns.key,                  /* Key file path */
        keyData: null,                    /* String or Buffer containing key data, as certData */
        passphrase: config.apns.passphrase,                 /* A passphrase for the Key file */
        ca: null,                         /* String or Buffer of CA data to use for the TLS connection */
        gateway: config.apns.sandbox ? 'gateway.sandbox.push.apple.com' : 'gateway.push.apple.com',/* gateway address */
        port: 2195,                       /* gateway port */
        enhanced: true,                   /* enable enhanced format */
        errorCallback: undefined,         /* Callback when error occurs function(err,notification) */
        cacheLength: 100                  /* Number of notifications to cache for error purposes */
    };
}
