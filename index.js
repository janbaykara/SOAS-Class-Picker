const express = require('express')
const path = require('path')
const app = express()
//
const getUndergraduateProgrammes = require("./getUndergraduateProgrammes.js");
const getCourse = require("./getCourse.js");
const getUnit = require("./getUnit.js");

app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

app.get('/api/ugprogrammes', (appReq, appRes) => {
	getUndergraduateProgrammes((programmes) => {
		appRes.json(programmes);
	});
});

app.get('/api/course/:courseName', (appReq, appRes) => {
	getCourse(appReq.params.courseName, (course) => {
		appRes.json(course);
	});
});

app.get('/api/unit/:unitCode', (appReq, appRes) => {
	getUnit(appReq.params.unitCode, (unit) => {
		appRes.json(unit);
	});
});

app.listen(3000, function () {
	console.log('Reader at 3000');
});
