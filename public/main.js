var STORAGE_KEY = 'soas-classess';

var localData = {
	fetch: function (year) {
		return JSON.parse(localStorage.getItem(STORAGE_KEY+year) || '[]');
	},
	save: function (selections,year) {
		localStorage.setItem(STORAGE_KEY+year, JSON.stringify(selections));
	}
};

Vue.component('app-class', {
	name: 'app-class',
	template: '#app-class',
	props: ['unitcode', 'unit']
});

Vue.component('app-year', {
	name: 'app-year',
	template: '#app-year',
	props: ['index', 'year', 'course', 'all'],
	data: function() {
		return {
			required_units: 4,
			selections: (function (year,coursetitle) {
				return JSON.parse(localStorage.getItem(STORAGE_KEY+coursetitle+year) || '[]');
			})(this.index,this.course.title)
		}
	},
	watch: {
		selections: {
			deep: true,
			handler: function (selections) {
				localStorage.setItem(STORAGE_KEY+this.course.title+this.index, JSON.stringify(selections));
			}
		}
	},
	computed: {
		classes: function() {
			return this.year.compulsory.concat(this.selections);
		},
		current_units: function() {
			var self = this;
			//
			var units = 0;
			self.classes.forEach(function(code) {
				units = units + self.unitVal(code);
			})
			return Number(units);
		}
	},
	methods: {
		isCompulsory: function(code) {
			return this.year.compulsory.indexOf(code) > -1;
		},
		isChosen: function(code) {
			return this.all.indexOf(code) > -1;
		},
		hasPrerequisites: function(code) {
			if(!this.course.options[code].prerequisite_computed) return true;

			var self = this;
			var requisitesMet = false;

			this.course.options[code].prerequisite_computed.forEach(function(preReqGrp) {
				var groupRequisites = true;
				preReqGrp.forEach(function(unitcode) {
					if(!self.isChosen(unitcode)) groupRequisites = false;
				});
				if(groupRequisites == true) requisitesMet = true;
			});

			return requisitesMet;
		},
		unitVal: function(code) {
			return Number(this.course.options[code].value);
		},
		isValidGroupChoice: function(group) {
			var n = _.intersection(group.options, this.selections).length;
			return !(group.min && n < group.min || group.max && n > group.max);
		},
		wontExceedUnitCap: function(code) {
			return this.current_units + this.unitVal(code) <= this.required_units
		},
		select: function(code, group) {
			if (!this.isChosen(code)
				&& this.wontExceedUnitCap(code)
				// && this.hasPrerequisites(code)
			) {
				this.selections.push(code);
				if(!this.isValidGroupChoice(group)) this.selections.pop();
			}
		},
		unselect: function(code) {
			if (this.isChosen(code) && !this.isCompulsory(code)) {
				this.selections.splice(this.selections.indexOf(code), 1);
			}
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
			loadingCourse: false
		},
		computed: {
			course: function() {
				return this.loadingCourse ? {} : this.progData[this.programme];
			},
			all: function() {
				var allClasses = [];
				this.$refs.all.forEach(function(el) {
					allClasses = allClasses.concat(el.classes);
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
						self.loadingCourse = false;
						self.progData[chosenProg] = course;
						console.log("!!! Finished:", chosenProg, self.course);
					});
				} else {
					console.log("Cached:",chosenProg, self.progData[chosenProg]);
				}
			}
		}
	});

});
