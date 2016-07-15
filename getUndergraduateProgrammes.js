const cheerio = require('cheerio');
const cachedRequest = require('./cachedRequest');

module.exports = function(callback) {
	var programmes = [];

	cachedRequest({url: "https://www.soas.ac.uk/admissions/ug/progs/"}, function(error, res, body) {
		var $ = cheerio.load(body);
		var links = $('#content .links a');

		links.each(function(index,link) {
			var course = {
				url: "https://www.soas.ac.uk"+$(link).attr('href'),
				path: $(link).attr('href').replace(/^\//,''),
				title: $(link).text()
			};
			if(/(combined honours|two subject|([\.]{3}|(\.\s){3}))/gi.test(course.title.toLowerCase())) {
				course.combination = true;
			}

			programmes.push(course);
		});
		if(typeof links != 'undefined' && links.length > 0) {
			programmes.sort(function(a, b) {
				return a.title.localeCompare(b.title);
			});
		}

		return callback(programmes);
	});
};
