var STORAGE_KEY = 'soas-classess';

var localData = {
	fetch: function (year) {
		return JSON.parse(localStorage.getItem(STORAGE_KEY+year) || '[]');
	},
	save: function (selectedCodes,year) {
		localStorage.setItem(STORAGE_KEY+year, JSON.stringify(selectedCodes));
	}
};

Vue.component('app-class', {
	name: 'app-class',
	template: '#app-class',
	props: ['unit']
});

Vue.component('app-year', {
	name: 'app-year',
	template: '#app-year',
	props: ['index', 'year', 'course', 'allclasscodes'],
	data: function() {
		return {
			requiredCredits: 4,
			selectedCodes: (function (year,coursetitle) {
				return JSON.parse(localStorage.getItem(STORAGE_KEY+coursetitle+year) || '[]');
			})(this.index,this.course.title)
		}
	},
	watch: {
		selectedCodes: {
			deep: true,
			handler: function (selectedCodes) {
				localStorage.setItem(STORAGE_KEY+this.course.title+this.index, JSON.stringify(selectedCodes));
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
			return this.allclasscodes.indexOf(unit.code) > -1;
		},
		hasPrerequisites: function(unit) {
			if(!unit.prerequisite_computed) return true;

			var self = this;
			var requisitesMet = false;

			unit.prerequisite_computed.forEach(function(preReqGrp) {
				var groupRequisites = true;
				preReqGrp.forEach(function(unitcode) {
					if(!self.isChosen(self.course.options[unitcode])) groupRequisites = false;
				});
				if(groupRequisites == true) requisitesMet = true;
			});

			return requisitesMet;
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
		    programme: '/politics/programmes/ba-politics-and-international-relations/', // default
			programmes: programmes,
			progData: {},
			loadingCourse: true
		},
		computed: {
			course: function() {
				this.loadCourse();
				return this.loadingCourse ? {} : this.progData[this.programme];
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
			loadCourse: function() {
				var self = this;
				var chosenProg = self.programme;
				console.log("----\nhttps://www.soas.ac.uk"+chosenProg);
				console.log("\nhttp://localhost:3000/api/course?path="+chosenProg);

				if(self.progData[chosenProg] == null) {
					self.loadingCourse = true;
					console.log("Loading:",chosenProg)

					$.get("/api/course?path="+chosenProg, function( course ) {
						self.progData[chosenProg] = course;
						self.loadingCourse = false;
						console.log("!!! Finished:", chosenProg, self.course);
						return self.course;
					});
				} else {
					self.loadingCourse = false;
					console.log("Cached:",chosenProg, self.progData[chosenProg]);
				}
			}
		}
	});

});
