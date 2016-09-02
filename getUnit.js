const cheerio = require('cheerio');
const cachedRequest = require('./cachedRequest');
const booleanParser = require('boolean-parser');
const getUnitTimetable = require("./getUnitTimetable");

module.exports = function(unitCode, callback) {
	var unit = {
		url: "https://www.soas.ac.uk/courseunits/"+unitCode+".html"
	};

	cachedRequest({url: unit.url}, function(error, res, body) {
		// console.log("Status code: " + res.statusCode + " - "+unitCode);

		if(error) {console.log("Error: " + error);return;}
		var $ = cheerio.load(body);

		var info = $('#content dl.tabular');
		var year    = info.find("dt:contains('Year of study') + dd").text() || null;
			term 	= info.find("dt:contains('Taught in') + dd").text().toLowerCase() || null;
			if(term != null) {
				term = term.indexOf("Full") > -1 ? [1, 2, 3] : [term]
				term.forEach(function(t,i) {
					term[i] = Number(t.replace("term ","").toLowerCase());
				});
			}
		unit.code   = Number(info.find("dt:contains('Course Code') + dd").text()) || Number(unitCode) || null;
		unit.credits  = Number(info.find("dt:contains('Unit value') + dd").text()) || null;

		unit.year = year != null ? Number(year.match(/year ([1-9])/ig)) : null;

		unit.term = term != null ? term : null;

		unit.title = $('#content h1').text().trim();

	// ## Parse preReq
		var preReqTitle = $('h4:contains("Prerequisites")') || null;
		if(preReqTitle !== null) {

			var dissectingHTML = $.html();
		// Split by H4
			dissectingHTML = dissectingHTML.split(/(<h4>[-\w\s,\.\:']+<\/h4>)/);
		// Find <h4>Prerequisites</h4>, add after: <div id='prerequisites_content'>
			var prereqIndex = null;
			dissectingHTML.filter(function(block, index) {
				if(block.indexOf("<h4>Prerequisites") == 0) {
					dissectingHTML[index+1] = "<div id='prerequisites_content'>" + dissectingHTML[index+1];
					dissectingHTML[index+2] = "</div>"+dissectingHTML[index+2];
				}
			});
		// Find next h4, add before: </div>
			dissectingHTML = dissectingHTML.join("");
		//
			$ = cheerio.load(dissectingHTML);

			preReqTitle = $('h4:contains("Prerequisites")');
			preReqContent = $('#prerequisites_content')
			preReqText = preReqContent.text().trim();

			if(preReqText != "") {
				unit.prerequisite_string = preReqText;
			}
			if(preReqText.indexOf("AND") > -1 || preReqText.indexOf("OR ") > -1) {
				preReqText = preReqText.split(".")[0];
				preReqText = preReqText.replace(" - "," ");
				preReqText = preReqText.replace("AND/OR","OR");

				preReqCode = preReqText.replace(/([0-9]{4,10})[\s-]+(([\A-z\s,'\:](?!AND|OR|AND\/OR))+)/g,"$1");
				unit.prerequisite_computed = booleanParser.parseBooleanQuery(preReqCode);
				unit.prerequisite_string_interpreted = booleanParser.parseBooleanQuery(preReqText);
			}

			// preReqTitle.remove();
			// preReqContent.remove();
		}

	// ## Get lecture/seminar hours

	// ## Get assessment criteria

	// ## Chop out disclaimer
		var disclaimer = $('h3:contains("Disclaimer")');
		disclaimer.nextUntil().remove();
		disclaimer.remove();

		$('h1').remove();
		$('dl').remove();
		var desc = $('#content article').html() || null;
		if(desc != null) {
			// desc = desc.replace(/(?:\r\n|\r|\n)/gi, '<br />'); // convert whitespace lines to real shit
			desc = desc.replace(/((<br \/>\s*){2,})/gi, ''); // multiple linebreaks
			desc = desc.replace(/(<\/*(p|ul|h[0-9])>[\s\n]*<br[\s\/]*>|<br[\s\/]*>[\s\n]*<\/(p|ul|h[0-9])>)/gi, ''); // empty paragraphs
			unit.description = desc;
		}

		// Add timetable data
		getUnitTimetable(unitCode, function(unitTimetable) {
			unit.classes = unitTimetable.classes;
			return callback(unit);
		})
	});
};
