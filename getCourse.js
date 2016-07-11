const cheerio = require('cheerio');
const cachedRequest = require('./cachedRequest');
//
const getUnit = require("./getUnit");

module.exports = function(coursePath, callback) {
	var $;
	var course = {
		url: "https://www.soas.ac.uk/"+coursePath,
		title: coursePath,
		structure: [],
		options: {}
	};
	console.log(coursePath,course.url)

	cachedRequest({url: course.url}, function(error, res, body) {
		if(error) {console.log("Error: " + error);return;}
		$ = cheerio.load(body);

		course.title = $('#content h1').text();

		/* * *
			Specific course structure
		* * */
		var courseStructure = $('#tab2').html();

		// ## Delimit HTML by <h5>Year [\w]</h5>
		var courseYears = courseStructure.split(/<h5>(Year [\w]+\s*|Prerequisites)<\/h5>/gi);
		courseYears = [ "<div><h1>"+courseYears[1]+"</h1>"+courseYears[2]+"</div>",
						"<div><h1>"+courseYears[3]+"</h1>"+courseYears[4]+"</div>",
						"<div><h1>"+courseYears[5]+"</h1>"+courseYears[6]+"</div>"];

		// ## For each Year, parse:
		courseYears.forEach(function(yearHTML, yearNumber) {
			$ = cheerio.load(yearHTML);

			course.structure[yearNumber] = {
				compulsory: [],
				optional: []
			};

			// #### COMPULSORY listed module IDs
			var compulsoryCodes = $('h1 + table td:nth-child(2)')
				.map(function(i, el) { return $(this).text().replace(" ","").trim(); }).get();
			course.structure[yearNumber].compulsory = compulsoryCodes;

			// #### OPTION RULES and module IDs
			var optionalDelimiters = $('h5');

			optionalDelimiters.each(function(i,elm) {
				var optionGroup = {};

				/*
					http://www.soas.ac.uk/politics/programmes/bapolitics/
						A. TWO of the following DISCIPLINARY units:
						ONE to THREE
						A: (+table)

						Parse capitalised words as numbers
				*/
				if ($(this).text().indexOf("At least ONE") > -1) {
					optionGroup.min = 1;
				} else
				if ($(this).text().indexOf("ONE of") > -1) {
					optionGroup.min = 1;
					optionGroup.max = 1;
				} else
				if ($(this).text().indexOf("another department") > -1 ||
					$(this).text().indexOf("open option") > -1) {
					optionGroup.external = true;
				} else if ($(this).next().is(':not(table)')) {
					return;
				}

				optionGroup.options = $(this).next().find('td:nth-child(2)')
					.map(function(i, el) {
						var code = $(this).text().trim().replace(/[\s\b ]+/g,"");
						if(code != null && code != "") return code;
					}).get();

				course.structure[yearNumber].optional.push(optionGroup);
			});
		});

		/* * *
			Scan all courses
		* * */
		$ = cheerio.load(body);
		var lesson_links = $('#tab2 table td:first-child a');

		// For each module URL listed on the course page...
		var unitCodes = [];
		lesson_links.each(function(index, unit) {
			var unit = $(unit).attr('href').match(/[0-9]{4,10}/)[0];
			unitCodes.push(unit)
		});

		function onlyUnique(value, index, self) { return self.indexOf(value) === index; }
		unitCodes = unitCodes.filter(onlyUnique);

		unitCodes.forEach(function(unitCode,index) {
			getUnit(unitCode, (unit) => {
				course.options[unitCode] = unit;
				if (Object.keys(course.options).length === unitCodes.length) {
					return callback(course);
				}
			});
		});
	});
};
