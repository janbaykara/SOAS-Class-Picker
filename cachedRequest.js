var request = require('request');
var cachedRequest = require('cached-request')(request);
cachedRequest.setCacheDirectory("./tmp/http_cache");
cachedRequest.setValue('ttl', 1000*60*60*24);//days

module.exports = cachedRequest;
