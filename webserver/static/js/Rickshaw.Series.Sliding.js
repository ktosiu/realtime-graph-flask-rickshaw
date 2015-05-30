Rickshaw.namespace('Rickshaw.Series.Sliding');

/* An extension of the Rickshaw.Series class

Minor modifications so that it doesn't require specifying things like the
time interval, or the base time, along with more comments as I tried to figure
out how everything works.
*/
Rickshaw.Series.Sliding = Rickshaw.Class.create(Rickshaw.Series, {

	initialize: function (data, palette, options) {

		options = options || {};

		this.palette = new Rickshaw.Color.Palette(palette);

		// Maximum data points the graph will display
		if (typeof(options.maxDataPoints) === 'undefined') {
			this.maxDataPoints = 100;
		} else {
			this.maxDataPoints = options.maxDataPoints;
		}

		// Set up for tracking size of array and index
		if (this[0] && this[0].data && this[0].data.length) {
			this.currentSize = this[0].data.length;
			this.currentIndex = this[0].data.length;
		} else {
			this.currentSize  = 0;
			this.currentIndex = 0;
		}


		// Add the first items from data
		if (data && (typeof(data) == "object") && Array.isArray(data)) {
			data.forEach( function (item) { this.addItem(item) }, this );
			this.currentSize  += 1;
			this.currentIndex += 1;
		}

		// zero-fill up to maxDataPoints size if we don't have that much data yet
		if ((typeof(this.maxDataPoints) !== 'undefined') && (this.currentSize < this.maxDataPoints)) {
			for (var i = this.maxDataPoints - this.currentSize - 1; i > 1; i--) {
				this.currentSize  += 1;
				this.currentIndex += 1;
				this.forEach( function (item) {
					item.data.unshift({ x: 0, y: 0});
				}, this );
			}
		}
	},

	// Add an item, normally what we'd think of as a series
	addItem: function(item) {

		if (typeof(item.name) === 'undefined') {
			throw('addItem() needs a name');
		}

		item.color = (item.color || this.palette.color(item.name));
		item.data = (item.data || []);

		// backfill, if necessary
		if ((item.data.length === 0) && this.length && (this.getIndex() > 0)) {
			this[0].data.forEach( function(plot) {
				item.data.push({ x: plot.x, y: 0 });
			} );
		} else if (item.data.length === 0) {
			item.data.push({ x: 0, y: 0 });
		} 

		this.push(item);

		if (this.legend) {
			this.legend.addLine(this.itemByName(item.name));
		}
	},


	// Add data to the series
	// data := {'key': <val>, ...}
	// x := <val>
	// Oddly, you can have multiple series as a part of a... series... which 
	// seems a bit misleading. In any case, each 'key' corresponds to a name
	// for a series.
	addData: function(data, x) {

		var index = this.getIndex();

		// In case you decide to throw in another series..?
		Rickshaw.keys(data).forEach( function(name) {
			if (! this.itemByName(name)) {
				this.addItem({ name: name });
			}
		}, this );

		// Add the data
		this.forEach( function(item) {
			item.data.push({ 
				x: x, 
				y: data[item.name]
			});
		}, this );


		// Increment current size and index
		this.currentSize += 1;
		this.currentIndex += 1;

		// Drop oldest data points as necessary
		if (this.maxDataPoints !== undefined) {
			while (this.currentSize > this.maxDataPoints) {
				this.dropData();
			}
		}
	},


	// Remove a single data point from the beginning of the array
	dropData: function() {

		this.forEach(function(item) {
			item.data.splice(0, 1);
		} );

		this.currentSize -= 1;
	},


	// Why do we have a single getter method for index but nothing else?
	getIndex: function () {
		return this.currentIndex;
	},


	// Dump a representation of the object
	dump: function() {

		var data = {
			items: []
		};

		this.forEach( function(item) {

			var newItem = {
				color: item.color,
				name: item.name,
				data: []
			};

			item.data.forEach( function(plot) {
				newItem.data.push({ x: plot.x, y: plot.y });
			} );

			data.items.push(newItem);
		} );

		return data;
	},

	// Load a series from its object representation
	load: function(data) {

		if (data.items) {
			data.items.forEach( function(item) {
				this.push(item);
				if (this.legend) {
					this.legend.addLine(this.itemByName(item.name));
				}

			}, this );
		}
	}
} );