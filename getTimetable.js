const cheerio = require('cheerio');
const merge = require('merge');
const cachedRequest = require('./cachedRequest');
//
const getUnitTimetable = require("./getUnitTimetable");

module.exports = function(unitCodeCollection, rootCallback) {
	var $;
	var unitCodes = unitCodeCollection.split(',');
	console.log("---\n1. Initial TIMETABLE request",unitCodes);

	unitCodes.forEach(function(unitCode, index) {
		console.log("2. Loading TIMETABLE for "+unitCode)
		getUnitTimetable(unitCode, aggregate)
	})

	var timetableData = [];
	var unitsLoaded = 0;

	function aggregate(unitTimetable) {
		unitsLoaded++;
		console.log("3. Loaded",unitTimetable.code)
		timetableData = timetableData.concat(unitTimetable.classes);

		if(unitsLoaded == unitCodes.length) {

			console.log("4. Sending data");
			rootCallback(timetableData);
		}
	}
};
