Vue.config.devtools = true
var STORAGE_KEY = 'soas-classess_';

Vue.component('app-class', {
	name: 'app-class',
	template: '#app-class',
	props: ['unit']
});

Vue.component('app-year', {
	name: 'app-year',
	template: '#app-year',
	props: ['yearnumber', 'year', 'course', 'allclasscodes','courseid'],
	data: function() {
		return {
			requiredCredits: 4,
			selectedCodes: (function (year,courseid) {
				return JSON.parse(localStorage.getItem(STORAGE_KEY+courseid+year) || '[]');
			})(this.yearnumber,this.courseid)
		}
	},
	watch: {
		selectedCodes: {
			deep: true,
			handler: function (selectedCodes) {
				localStorage.setItem(STORAGE_KEY+this.courseid+this.yearnumber, JSON.stringify(selectedCodes));
			}
		}
	},
	computed: {
		requiredCodes: function() {
			var requiredCodes = [];
			this.year.option_groups.forEach(function(group) {
				if(group.required == true || group.type == 'core' || group.type == 'compulsory')
					requiredCodes = requiredCodes.concat(group.options);
			});
			return requiredCodes;
		},
		classCodes: function() {
			return this.selectedCodes.concat(this.requiredCodes);
		},
		classObjects: function() {
			var self = this;
			var classArr = [];
			self.classCodes.forEach(function(code) {
				classArr.push(self.course.options[code]);
			})
			return classArr;
		},
		currentCredits: function() {
			var credits = 0;
			for (var code in this.classObjects) {
				credits = credits + Number(this.classObjects[code].credits);
			}
			return Number(credits);
		},
		classes: function() {
			var output = [];
			this.classObjects.forEach(function(unit) {
				output = output.concat(unit.classes);
			})
			return output;
		}
	},
	methods: {
		isRequired: function(unit) {
			var is_required = false;
			this.year.option_groups.forEach(function(group) {
				if(group.required && group.options.indexOf(unit.code) > -1)
					return is_required = true;
			});
			return is_required;
		},
		isChosen: function(unit) {
			unitcode = unit !== null && typeof unit === 'object' ? unit.code : unit
			return this.allclasscodes.indexOf(Number(unitcode)) > -1;
		},
		missingPrerequisites: function(unit) {
			if(!unit.prerequisite_computed) return false;

			var self = this;
			var requisitesMet = false;

			var result = !_.some(unit.prerequisite_computed, function(preReqGrp) {
				return _.every(preReqGrp, function(unitcode) {
					return self.isChosen(unitcode)
				});
			});
			return result;
		},
		isValidGroupChoice: function(delta,unit,group) {
			var qty = _.intersection(group.options, this.selectedCodes).length;
			var valid = (group.min !== null && qty >= group.min && qty+delta < group.min
					  || group.max !== null && qty <= group.max && qty+delta > group.max);
			//
			return !valid;
		},
		wontExceedUnitCap: function(unit) {
			return this.currentCredits + unit.credits <= this.requiredCredits
		},
		select: function(unit, group) {
			if (!this.isChosen(unit)
				&& this.wontExceedUnitCap(unit)
				&& this.isValidGroupChoice(1, unit, group)
			) {
				this.selectedCodes.push(unit.code);
			}
		},
		unselect: function(unit) {
			if (this.isChosen(unit)
				&& !this.isRequired(unit)
				// && this.isValidGroupChoice(-1, unit, this.optionGroupOf(unit))
			) {
				this.selectedCodes.splice(this.selectedCodes.indexOf(unit.code), 1);
			}
		},
		optionGroupOf: function(unit) {
			var theGroup = null;
			this.year.option_groups.forEach(function(group) {
				if(group.options.indexOf(unit.code) > -1) theGroup = group;
			})
			return theGroup;
		},
		dayHasClasses: function(dayI) {
			var show = false;
			this.classes.forEach(function(CLASS) {
			 	if(CLASS.time.dayI == dayI) show = true;
			})
			return show;
		}
	},
	filters: {
		unitsFromGrp: function(codes, dictionary) {
			var units = [];
			codes.forEach(function(code) {
				units.push(dictionary[code]);
			})
			return units;
		},
		dayFromI: function(number) {
			var days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
			return days[number];
		}
	}
});

$.get("api/ugprogrammes", function( programmes ) {

	var app = new Vue({
		el: '#app',
		data: {
			programmes: programmes,
			progData: {},
			programme: (function () {
				return JSON.parse(localStorage.getItem(STORAGE_KEY+"selectedProgramme")) || [_.find(programmes, function(degree) { return degree.path == "politics/programmes/bapoliticsand/" }),
				_.find(programmes, function(degree) { return degree.path == "politics/programmes/baintreland/" })]
			})()
		},
		watch: {
			programme: {
				deep: true,
				handler: function (programme) {
					if(!programme[0].combination)
						delete programme[1];

					console.log("Storing programme",programme)
					localStorage.setItem(STORAGE_KEY+"selectedProgramme", JSON.stringify(programme));
				}
			}
		},
		computed: {
			isCombinedCourse: function() {
				return this.programme[0].combination
			},
			isLoadingCourse: function() {
				return !this.progData[this.courseid];
			},
			courseid: function() {
				if(this.programme[1]) return _.sortBy([this.programme[0].path,this.programme[1].path]).join(",")
				return this.programme[0].path;
			},
			course: {
				cache: true,
				get: function() {
					var course = this.progData[this.courseid];

					console.log("Course data updated!",course);
					return course;
				}
			},
			allclasscodes: function() {
				var allClasses = [];
				this.$refs.allclasscodes.forEach(function(year) {
					allClasses = allClasses.concat(year.classCodes);
				})
				return allClasses;
			}
		},
		methods: {
			degreeFromPath: function(path) {
				return _.find(this.programmes, function(degree) { return degree.path == path });
			},
			loadCourse: function() {
				var self = this;

				// console.log("----\nhttps://www.soas.ac.uk"+p.path);
				console.log("---\nFetching: http://localhost:3000/api/course?path="+self.courseid);

				if(self.progData[self.courseid] == null) {
					console.log("Loading:", self.courseid)

					$.get("api/course?path="+self.courseid, function( course ) {
						// self.progData[self.courseid] = course;
						Vue.set(self.progData, self.courseid, course);
						console.log("Finished:", self.courseid, self.progData[self.courseid]);
						return self.isLoadingCourse;
					});
				} else {
					console.log("Cached:", self.courseid, self.progData);
					return self.isLoadingCourse;
				}
			},
			isSecondCourse: function(coursePath) {
				// console.log("CourseIsSecond?",coursePath,this.course.path[0],coursePath == this.course.path[0])
				return coursePath == this.course.path[0]
			}
		}
	});

	app.loadCourse();

});
