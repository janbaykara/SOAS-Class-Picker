const express = require('express')
const path = require('path')
const app = express()
//
const getUndergraduateProgrammes = require("./getUndergraduateProgrammes");
const getCourse = require("./getCourse");
const getUnit = require("./getUnit");

app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

app.get('/api/ugprogrammes', (appReq, appRes) => {
	getUndergraduateProgrammes((programmes) => {
		appRes.json(programmes);
	});
});

app.get('/api/course', (appReq, appRes) => {
	getCourse(appReq.query.path, (course) => {
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
