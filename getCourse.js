const cheerio = require('cheerio');
const cachedRequest = require('./cachedRequest');
//
const getUnit = require("./getUnit");

module.exports = function(coursePath, callback) {
	var $;
	coursePath = coursePath.replace(/^\//,'');
	console.log(coursePath);
	var course = {
		url: "https://www.soas.ac.uk/"+coursePath,
		title: coursePath,
		structure: [],
		options: {}
	};

	cachedRequest({url: course.url}, function(error, res, body) {
		if(error) { console.log("Error: " + error); return; }
		$ = cheerio.load(body);

		course.title = $('#content h1').text();

		/* * *
			Specific course structure
		* * */
		var courseStructure = $('#tab2').html() || null;

		if(courseStructure != null) {
			// ## Delimit HTML by <h5>Year [\w]</h5>
			var courseYears = courseStructure.split(/<h5>(Year [\w]+\s*|Prerequisites)<\/h5>/gi);
			courseYears = [ "<div><h1>"+courseYears[1]+"</h1>"+courseYears[2]+"</div>",
							"<div><h1>"+courseYears[3]+"</h1>"+courseYears[4]+"</div>",
							"<div><h1>"+courseYears[5]+"</h1>"+courseYears[6]+"</div>"];

			// ## For each Year, parse:
			courseYears.forEach(function(yearHTML, yearNumber) {
				$ = cheerio.load(yearHTML);
				var year = course.structure[yearNumber] = {
					year: Number(yearNumber+1),
					option_groups: []
				};

				// Compulsory/core modules
				var compulsory = $('h1 + table, h1 + p + table');

				if(compulsory && compulsory.length > 0) {
					var compulsoryMods = compulsory.find('td:nth-child(2)').map(function(i, el) {
						var code = $(this).text().trim().replace(/[\s\b ]+/g,"");
						if(code != null && code != "") return Number(code);
					}).get() || null;
					compulsory.remove();

					year.option_groups.push({
						required: true,
						options: compulsoryMods
					})
				}

				// #### OPTION RULES and module IDs
				var optionalDelimiters = $('h5,h6');

				optionalDelimiters.each(function(i,elm) {
					// console.log($(elm).text());
					var optionGroup = {};

					var optionHeadingTxt = optionGroup.rules = $(this).text();
					optionHeadingTxt = optionHeadingTxt.toLowerCase();

					var numtrans =[ ["zero",0],["one",1],["two",2],["three",3],["four",4],["five",5],["six",6],["seven",7],["eight",8],["nine",9],["ten",10]]
					numtrans.forEach(function(el,i,arr) {
						optionHeadingTxt = optionHeadingTxt.replace(el[0],el[1]);
					});
					/*
						http://www.soas.ac.uk/politics/programmes/bapolitics/
							A. TWO of the following DISCIPLINARY units:
							ONE to THREE
							ONE or TWO
							A: (+table)

							Parse capitalised words as numbers
					*/
					if (/At least ([0-9])/i.test(optionHeadingTxt)) {
						var values = optionHeadingTxt.match(/At least ([0-9])/i);
						optionGroup.min = values[1];
					} else
					if (/([0-9]) (or|to) ([0-9])/i.test(optionHeadingTxt)) {
						var values = optionHeadingTxt.match(/([0-9]) (or|to) ([0-9])/i);
						optionGroup.min = values[1];
						optionGroup.max = values[3];
					} else
					if (/([0-9]) of/i.test(optionHeadingTxt)) {
						var values = optionHeadingTxt.match(/([0-9]) of/i);
						optionGroup.min = values[1];
						optionGroup.max = values[1];
					} else
					if (optionHeadingTxt.indexOf("another department") > -1 ||
						optionHeadingTxt.indexOf("open option") > -1) {
						optionGroup.external = true;
					} else if (!$(this).nextUntil('h5,h6').is('table')) {
						// console.log("      ---has no table");
						return;
					}

					optionGroup.options = $(this).nextUntil('h5,h6').find('td:nth-child(2)')
						.map(function(i, el) {
							var code = $(this).text().trim().replace(/[\s\b ]+/g,"");
							if(code != null && code != "") return Number(code);
						}).get();

					if(optionGroup.options.length > 0) {
						// if(optionGroup.options.length == 1) optionGroup.required = true;
						if(/(core|compulsory)/.test(optionGroup.rules.toLowerCase())) optionGroup.required = true;
						optionGroup.min = Number(optionGroup.min) || null;
						optionGroup.max = Number(optionGroup.max) || null;
						year.option_groups.push(optionGroup);
					}
				});
			});
		}

		/* * *
			Scan all courses
		* * */
		$ = cheerio.load(body);
		var lesson_links = $('#tab2 table td:first-child a');

		// For each module URL listed on the course page...
		var unitCodes = [];
		lesson_links.each(function(index, unit) {
			var unit = $(unit).attr('href').match(/[0-9]{4,10}/gi)[0];
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
