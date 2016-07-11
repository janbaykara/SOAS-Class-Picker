const cheerio = require('cheerio');
const cachedRequest = require('./cachedRequest');

module.exports = function(callback) {
	var programmes = [];

	cachedRequest({url: "https://www.soas.ac.uk/admissions/ug/progs/"}, function(error, res, body) {
		var $ = cheerio.load(body);
		var links = $('#content .links a');

		links.each(function(index,link) {
			programmes.push({
				url: $(link).attr('href'),
				title: $(link).text()
			});
		});

		return callback(programmes);
	});
};
