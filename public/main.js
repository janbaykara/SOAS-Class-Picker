var STORAGE_KEY = 'soas-classess';

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
					if(unit.code == 153400075) console.log(preReqGrp,self.isChosen(unitcode))
					return self.isChosen(unitcode)
				});
			});
			return result;
		},
		isValidGroupChoice: function(delta,unit,group) {
			var qty = _.intersection(group.options, this.selectedCodes).length;
			// console.log("Too few:",qty,group.min,group.min !== null && qty < group.min)
			// console.log("Too many:",qty,group.max,group.max !== null && qty > group.max)
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
		}
	},
	filters: {
		unitsFromGrp: function(codes, dictionary) {
			var units = [];
			codes.forEach(function(code) {
				units.push(dictionary[code]);
			})
			return units;
		}
	}
});

$.get("/api/ugprogrammes", function( programmes ) {

	var app = new Vue({
		el: '#app',
		data: {
			programmes: programmes,
			progData: {},
			programme: (function () {
				return JSON.parse(localStorage.getItem(STORAGE_KEY+"selectedProgramme")) || [_.find(programmes, function(degree) { return degree.path == "politics/programmes/ba-politics-and-international-relations/" })]
			})()
		},
		watch: {
			programme: {
				deep: true,
				handler: function (programme) {
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

				if(this.programme[0].combination) {
					delete self.programme[1]
				}

				// console.log("----\nhttps://www.soas.ac.uk"+p.path);
				console.log("---\nFetching: http://localhost:3000/api/course?path="+self.courseid);

				if(self.progData[self.courseid] == null) {
					console.log("Loading:", self.courseid)

					$.get("/api/course?path="+self.courseid, function( course ) {
						// self.progData[self.courseid] = course;
						Vue.set(self.progData, self.courseid, course);
						console.log("Finished:", self.courseid, self.progData[self.courseid]);
						return self.isLoadingCourse;
					});
				} else {
					console.log("Cached:", self.courseid, self.progData);
					return self.isLoadingCourse;
				}
			}
		}
	});

	app.loadCourse();

});
