module.exports = {
	hasOwnProperty: function(obj, name) {
		for(var i in obj)
			if(i == name) return true;
		return false;
	},

	isArray: function(obj) {
		if(Object.prototype.toString.apply(obj) == '[object Array]')
			return true;
		else
			return false;	
	},

	dot: function() {
		var res = '';
		for(var i in arguments)
			res+= '.' + arguments[i];
		return res.substr(1);
	},
};