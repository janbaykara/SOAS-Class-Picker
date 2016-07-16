const cheerio = require('cheerio');
const merge = require('merge');
const cachedRequest = require('./cachedRequest');
//
const getUnit = require("./getUnit");

module.exports = function(coursePath, rootCallback) {
	var $;
	var coursePaths = coursePath.split(',');
	console.log("---\n1. Initial request",coursePaths);

	coursePaths.forEach(function(coursePath, index) {
		console.log("2. Loading "+coursePath)
		parseCourse(coursePath, wrapUp)
	})

	var courseData = [];

	function wrapUp(course) {
		console.log("3. Loaded",course.path[0])
		courseData.push(course);

		if(courseData.length == coursePaths.length) {
			var c1 = courseData[0];

			if(coursePaths.length == 2) {
				var c2 = courseData[1];

				c1.combination = true;
				c1.path.push(c2.path[0])
				c1.meta = merge(c1.meta,c2.meta);
				c1.structure.forEach(function(year, i) {
					// console.log("Merging Yr "+i+"; no. of course: ",c1.structure[i].option_groups.length,c2.structure[i].option_groups.length)
					c1.structure[i].option_groups = c1.structure[i].option_groups.concat(c2.structure[i].option_groups);
				});
				c1.options = merge(c1.options, c2.options);
			}

			console.log("4. Sending data");
			rootCallback(c1);
		}
	}

	function parseCourse(coursePath,finishedLoading) {
		coursePath = coursePath.replace(/^\//,'');
		console.log(coursePath);
		var course = {
			path: [coursePath],
			combination: false,
			meta: {},
			structure: [],
			options: {}
		};

		course.meta[coursePath] = {
			url: "https://www.soas.ac.uk/"+coursePath,
			title: null,
			classification: null,
			subject: null
		};

		cachedRequest({url: course.meta[coursePath].url}, function(error, res, body) {
			if(error) { console.log("Error: " + error); return; }
			$ = cheerio.load(body);

			course.meta[coursePath].title = $('#content h1').text();
			var courseTitleProps = /^(B[A-z]+) (?:\.\.\. and )?([\(\)\w\d ]+)/gi.exec(course.meta[coursePath].title);
			course.meta[coursePath].classification = courseTitleProps[1];
			course.meta[coursePath].subject = courseTitleProps[2].trim().replace(/ and$/,"");
			// console.log(courseTitleProps);

			if(/(combined honours|two subject|([\.]{3}|(\.\s){3}))/gi.test(course.meta[coursePath].title.toLowerCase())) {
				course.combination = true;
			}

			/* * *
				Specific course structure
			* * */
			var tabId = "#"+$('.tabs > *:contains("Structure")').attr('rel');
			var courseStructure = $(tabId).html() || null;

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

					if(compulsory && compulsory.length > 0 && compulsory.next().text() != "OR") {
						var compulsoryMods = compulsory.find('td:nth-child(2)').map(function(i, el) {
							var code = $(this).text().trim().replace(/[\s\b ]+/g,"");
							if(code != null && code != "") return Number(code);
						}).get() || null;
						compulsory.remove();

						year.option_groups.push({
							required: true,
							options: compulsoryMods,
							coursePath: coursePath
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
							return false;
						}

						optionGroup.options = $(this).nextUntil('h5,h6').find('td:nth-child(2)')
							.map(function(i, el) {
								var code = $(this).text().trim().replace(/[\s\b ]+/g,"");
								if(code != null && code != "") return Number(code);
							}).get();

						if(optionGroup.options.length > 0) {
							if(/(core|compulsory)/.test(optionGroup.rules.toLowerCase())
								&& (!optionalDelimiters[i+1] || $(optionalDelimiters[i+1]).text() !== "OR"))
									optionGroup.required = true;
							optionGroup.min = Number(optionGroup.min) || null;
							optionGroup.max = Number(optionGroup.max) || null;
							optionGroup.coursePath = coursePath;
							year.option_groups.push(optionGroup);
						}
					});
				});
			}

			/* * *
				Scan all courses
			* * */
			$ = cheerio.load(body);
			var lesson_links = $(tabId+' table td:first-child a');

			// For each module URL listed on the course page...
			var unitCodes = [];
			lesson_links.each(function(index, unit) {
				var unitCodeFinds = $(unit).attr('href').match(/[0-9]{4,10}/gi);
				if(unitCodeFinds) unitCodes.push(unitCodeFinds[0])
			});

			function onlyUnique(value, index, self) { return self.indexOf(value) === index; }
			unitCodes = unitCodes.filter(onlyUnique);

			unitCodes.forEach(function(unitCode,index) {
				getUnit(unitCode, (unit) => {
					course.options[unitCode] = unit;
					course.options[unitCode].coursePath = coursePath;
					if (Object.keys(course.options).length === unitCodes.length) {
						return finishedLoading(course);
					}
				});
			});
		});
	};
};
