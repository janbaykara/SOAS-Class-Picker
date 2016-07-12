const cheerio = require('cheerio');
const cachedRequest = require('./cachedRequest');

module.exports = function(callback) {
	var programmes = [];

	cachedRequest({url: "https://www.soas.ac.uk/admissions/ug/progs/"}, function(error, res, body) {
		var $ = cheerio.load(body);
		var links = $('#content .links a');

		links.each(function(index,link) {
			programmes.push({
				url: "https://www.soas.ac.uk"+$(link).attr('href'),
				path: $(link).attr('href'),
				title: $(link).text()
			});
		});
		programmes.sort(function(a, b) {
		   return a.title.localeCompare(b.title);
		});

		return callback(programmes);
	});
};
