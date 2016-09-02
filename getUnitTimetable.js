const cheerio = require('cheerio');
const cachedRequest = require('./cachedRequest');
const booleanParser = require('boolean-parser');
const tabletojson = require('tabletojson');

module.exports = function(unitCode, callback) {
	var unit = {
		code: unitCode,
		url: "http://www.soas.ac.uk/snorri"+(new Date().getFullYear().toString().substr(2,2))+""+(parseInt(new Date().getFullYear().toString().substr(2,2))+1)+"/reporting/individual;module;id;"+unitCode+"-A"+(new Date().getFullYear().toString().substr(2,2))+"/"+(parseInt(new Date().getFullYear().toString().substr(2,2))+1)+"%0D%0A?days=1-7&weeks=2;3;4;5;6;8;9;10;11;12;16;17;18;19;20;22;23;24;25;26;31;32;&periods=1-16&template=module+individual&height=100&week=100",
		classes: []
	};

	cachedRequest({url: unit.url}, function(error, res, body) {
		// console.log("Status code: " + res.statusCode + " - "+unitCode);
		if(error) {console.log("Error: " + error);return;}

		var $ = cheerio.load(body);
		var info = $('table.grid-border-args');

		var times = [];
		var days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]

		var currentDay = 0;

		info.children().each(function(rowI, row) {
			var currentTime = times[1];

			if(rowI > 0) {
				if($(row).find('.row-label-one')) {
					// New day
					var rowsPerDay = parseInt( $(row).find('.row-label-one').first().attr('rowspan') );
					var currentRowInDayCycle = 0;

					$(row).find('.row-label-one').remove();
				}
			}

			$(row).children().each(function(cellI, cell) {

				// Get times
				if(rowI === 0) {
					times[cellI] = parseInt($(cell).text().split(":")[0]);
				} else {
					var CLASS_dump = tabletojson.convert( $(cell).html() );

					if(CLASS_dump.length < 1) {
					   	currentTime += 1;
					} else {
						var hours = parseInt( $(cell).attr('colspan') || 1 );
						var start_time = currentTime;
						var end_time = currentTime + hours;
						currentTime = end_time + 1;

						var CLASS = {
							unit:		unitCode,
							name: 		CLASS_dump[1][0] ? CLASS_dump[1][0][0] : null,
							term: 		CLASS_dump[0] ? CLASS_dump[0][0][1] : null,
							location: 	CLASS_dump[2] ? CLASS_dump[2][0][2] : null,
							manager: 	CLASS_dump[2] ? CLASS_dump[2][0][0] : null,
							staff: 		CLASS_dump[2] ? CLASS_dump[2][0][1].split(", ") : null,
							time: {
								day:    days[currentDay],
								dayI:   currentDay,
								start: 	start_time,
								length: hours,
								end: 	end_time
							}
						}

						unit.classes.push(CLASS);
					}
				}
			});

			if(rowI > 0) {
				currentRowInDayCycle++;
				if(rowsPerDay == currentRowInDayCycle) currentDay++;
			}
		});
		return callback(unit);
	});
};
