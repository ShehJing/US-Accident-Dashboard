
function accident_map(data){
	var countyIdMapping = {};
	var idToCounty = {}
	var monthYear = ["Jan 2016", "Feb 2016", "Mar 2016", "Apr 2016", "May 2016", "Jun 2016", 
					"Jul 2016", "Aug 2016", "Sep 2016", "Oct 2016", "Nov 2016", "Dec 2016",
					"Jan 2017", "Feb 2017", "Mar 2017", "Apr 2017", "May 2017", "Jun 2017", 
					"Jul 2017", "Aug 2017", "Sep 2017", "Oct 2017", "Nov 2017", "Dec 2017",
					"Jan 2018", "Feb 2018", "Mar 2018", "Apr 2018", "May 2018", "Jun 2018", 
					"Jul 2018", "Aug 2018", "Sep 2018", "Oct 2018", "Nov 2018", "Dec 2018",
					"Jan 2019", "Feb 2019", "Mar 2019", "Apr 2019", "May 2019", "Jun 2019", 
					"Jul 2019", "Aug 2019", "Sep 2019", "Oct 2019", "Nov 2019", "Dec 2019"
				];

	d3.tsv("data/us-county-names.tsv").then(function(county){
		var stateName = ""
		for(i=0; i<county.length; i++){
			if(+(county[i].id)%1000 == 0){
				stateName = county[i].name
			}else{
				countyIdMapping[county[i].name+"/"+stateName] = county[i].id;
				idToCounty[county[i].id] = county[i].name;
			}
		}
		
		//prepare data
		accidentMapData = data.map(function(d){
			return {
				"year": d.Start_Time.split(" ")[0].split("-")[0],
				"month": d.Start_Time.split(" ")[0].split("-")[1],
				"id": countyIdMapping[d.County+"/"+abbrState(d.State,"name")]
			};
		});

		var summarised_data = d3.nest()
								.key(function(d) { return d.year; })
								.key(function(d) { return d.month; })
								.key(function(d) { return d.id; })
								.rollup(function(v) { return v.length; })
								.entries(accidentMapData);

		summarised_data = summarised_data.sort(function(a, b) { return a.key - b.key; });
		
		for(i=0; i<summarised_data.length; i++){
			summarised_data[i].values = summarised_data[i].values.sort(function(a, b) { return a.key - b.key; })
		}

		var final_data = [];
		var maxValues = [];
		for(i=0; i<summarised_data.length; i++){
			for(j=0; j<(summarised_data[i].values).length; j++){
				final_data.push(summarised_data[i].values[j].values)
				var temp = d3.max(summarised_data[i].values[j].values, function(d){
					return d.value;
				})
				maxValues.push(temp);
			}
		}

		d3.json("data/us.json").then(function(mapjson){
			var counties = mapjson.objects.counties.geometries;

			for(i=0; i<counties.length; i++) { 
				counties[i].properties = {}
				for(j=0; j<final_data.length; j++) {  //for each month
					for(k=0; k<final_data[j].length; k++){	//for each county
						if(counties[i].id != final_data[j][k].key){  //if id not the same, continue
							continue;
						}else{
							counties[i].properties[monthYear[j]] = final_data[j][k].value;
							break
						}
					}
				}
			}

			//set the dimension 
			var margin = {top: 10, right: 30, bottom: 30, left: 30};
			var width = 475 - margin.left - margin.right;
			var height = 275 - margin.top - margin.bottom;
			
			var svg = d3.select("#mapAnimation")
							.append("svg")
							.attr("width", width + margin.left + margin.right)
							.attr("height", height + margin.top + margin.bottom*2)
							.attr("transform", "translate(" + (margin.left+15) + "," + margin.top + " )" );

			function scale (scaleFactor) {
				return d3.geoTransform({
					point: function(x, y) {
						this.stream.point(x * scaleFactor, y  * scaleFactor);
					}
				});
			}

			//path generator
			var path = d3.geoPath().projection(scale(0.5));
			var current = 0; //index of current month

			//month year display
			d3.select('#clock').html(monthYear[current]);

			//div for tooltip
			var div = d3.select('body')
				.append('div')
				.attr('class', 'tooltip')
				.style('opacity', 0);
			
			svg.append("g")
				.attr("class", "counties")
				.selectAll(".county") 
				.data(topojson.feature(mapjson, mapjson.objects.counties).features)  //bind data 
				.enter()
				.append("path") 
				.attr("class", "county") 
				.attr("d", path)
				.on("mouseover", function(d,i) {		
					div.transition()		
						.duration(200)
						.style("opacity", .9);

					var num = d.properties[monthYear[current]] ? d.properties[monthYear[current]] : 0;
					
					div.html(idToCounty[d.id] + " : "  + num + " accidents")	
						.style('left', d3.event.pageX + 25 + 'px')
						.style('top', d3.event.pageY - 28 + 'px');
				})
				.on("mouseout", function(d) {		
					div.transition()
						.duration(500)
						.style("opacity", 0);
				});


			var dataRange = getDataRange(); //get the min/max values from the current month's range of data values
			d3.selectAll(".county")  //select all the counties
				.attr("fill", function(d) {
					return getColor(d.properties[monthYear[current]], dataRange);  
				});

			
			function getColor(valueIn, valuesIn) {
				//Define linear scale to sort data values into buckets of color
				var lowColor = '#c6dbef';
				var highColor = '#08519c';
				var color = d3.scaleLinear()
								.range([lowColor, highColor])
								.domain([valuesIn[0], valuesIn[1]]);
				return color(valueIn);
			}

			function getDataRange() {
				//function loops through all the data values from the current data attribute
				//and returns the min and max values
				var min = Infinity, max = -Infinity; 

				d3.selectAll(".county")
					.each(function(d,i) {
						var currentValue = d.properties[monthYear[current]];
						if(currentValue == 'undefined') {
							currentValue = 0;
						}
						if(currentValue <  min && currentValue != 'undefined') {
							min = currentValue;
						}
						if(currentValue >  max && currentValue != 'undefined') {
							max = currentValue;
						}
					});

				if(min == max && min != 0){
					min = 0;
				}
				if(min == 0 && max == 0) {
					min = 0;
					max = 1;
				}
				return [min,max];  //return min and max
			}

			// add a legend 
			var w = 60, h = 300;
			var lowColor = '#c6dbef';
			var highColor = '#08519c';

			var key = d3.select("#mapAnimation")
						.append("svg")
						.attr("width", w)
						.attr("height", h+20)
						.attr("class", "legend")
						.attr("transform", "translate(0,10)");

			var legend = key.append("defs")
							.append("svg:linearGradient")
							.attr("id", "gradient")
							.attr("x1", "100%")
							.attr("y1", "0%")
							.attr("x2", "100%")
							.attr("y2", "100%")
							.attr("spreadMethod", "pad");

			legend.append("stop")
					.attr("offset", "0%")
					.attr("stop-color", highColor)
					.attr("stop-opacity", 1);
				
			legend.append("stop")
					.attr("offset", "100%")
					.attr("stop-color", lowColor)
					.attr("stop-opacity", 1);

			key.append("rect")
				.attr("width", w - 50)
				.attr("height", h)
				.style("fill", "url(#gradient)")
				.attr("transform", "translate(0,30)");

			var y = d3.scaleLinear()
						.range([h, 0])
						.domain(getDataRange())
						.nice();

			var yAxis = d3.axisRight(y)
							//.tickFormat(d3.format(".2s"));

			key.append("g")
				.attr("class", "y_axis")
				.attr("transform", "translate(11,30)")
				.call(yAxis);


			function sequenceMap() {
				var dataRange = getDataRange(); //get the min/max values from the current month's range of data values
				d3.selectAll(".county")
					.transition()  //select all the counties and prepare for a transition to new values
					.duration(3000)  
					.attr("fill", function(d) {
						return getColor(d.properties[monthYear[current]], dataRange);
					})

				var y = d3.scaleLinear()
						.range([h, 0])
						.domain(dataRange)
						.nice();
				var yAxis = d3.axisRight(y);

				d3.selectAll(".y_axis")
					.call(yAxis)
			}

			var playing = false;

			function animateMap() {
				var timer;  // create timer object
				d3.select("#play")  
					.on("click", function() {  //when user clicks the play button
						if(playing == false) {  //if the map is currently playing
							timer = setInterval(function(){   // set a JS interval
								if(current < monthYear.length-1) {  
									current +=1;  //increment the current attribute counter
								} else {
									current = 0;  //or reset it to zero
								}
								sequenceMap();  //update the representation of the map 
								d3.select("#clock").html(monthYear[current]);  //update the clock
							}, 2000);

							d3.select(this).html("Stop");  //change the button label to stop
							playing = true;   //change the status of the animation
						} else {    // lse if is currently playing
							clearInterval(timer);   //stop the animation by clearing the interval
							d3.select(this).html("Play");   //change the button label to play
							playing = false;   //set playing to false
						}
					});

				d3.select("#reset")  
					.on("click", function() {  //when user clicks the reset button
						d3.select("#play").html("Play");   //change the button label to play
						playing = false;   //set playing to false
						clearInterval(timer);  //clear interval to stop
						current = 0;  //reset index to 0
						sequenceMap();  //update the representation of the map 
						d3.select("#clock").html(monthYear[current]);  //update the clock
					});
			}

			animateMap()
		})
	})
}


function num_accident_by_hour(data){
	const hour_accidents = document.getElementById("hourAccidents");

	// flush the previous content
	if(hour_accidents.childNodes.length > 0){
	  while(hour_accidents.firstElementChild){ hour_accidents.firstElementChild.remove(); }
	}

	var margin = {top: 10, right: 30, bottom: 30, left: 30};
	var width = 500 - margin.left - margin.right;
	var height = 350 - margin.top - margin.bottom*2;

	//extract only start time
	var accidentDateTime = data.map(function(d){
		return {"Start_Time": d.Start_Time};
	});

	//get the year and hour value from start time
	accidentDateTime.forEach(function(d){
		date = d.Start_Time.split(" ")[0];
		time = d.Start_Time.split(" ")[1];

		d.year = parseInt(date.split("-")[0]);
		d.hour = parseInt(time.split(":")[0]);
	});
	
	//group the data by hour
	var summarised_data = d3.nest()
							   .key(function(d) { return d.hour; })
							   .rollup(function(v) { return v.length; })
							   .entries(accidentDateTime);
	//console.log(summarised_data);

	var x = d3.scaleLinear()
				.domain([0,23])
				.range([0, width-20]);

	var y = d3.scaleLinear()
				.domain([0, d3.max(summarised_data, function(d){
					return d.value;
				})])
				.range([height, 0])
				.nice();

	var svg = d3.select("#hourAccidents")
				.append("svg")
				.attr("width", width+margin.left+margin.right)
				.attr("height", height+margin.top+margin.bottom)
				.append("g")
				.attr("transform", "translate("+ margin.left + "," + 0 + ")");

	//draw x-axis
	svg.append("g")
		.call(
			d3.axisBottom(x)
				.scale(x)
				.ticks(24)
		)
		.attr("transform", "translate("+ margin.left + "," + (height + margin.top) + ")");

	//x-axis label
	svg.append("text")             
		.attr("transform", "translate(" + (width/2+margin.left) + " ," + (height+margin.top+margin.bottom) + ")")
		.style("text-anchor", "middle")
		.style("font-size", "12px")
		.style("fill", "black")
		.text("Hour");
	
	//draw y-axis
	svg.append("g")
		.call(
			d3.axisLeft()
				.scale(y)
				.tickFormat(d3.format(".3s"))
		)
		.attr("transform", "translate("+ margin.left + "," + margin.top + ")");

	//y-axis label
	svg.append("text")             
		.attr("transform", "rotate(-90)")
		.attr("x", -(height/2))
		.attr("y", -10)
		.style("text-anchor", "middle")
		.style("font-size", "12px")
		.style("fill", "black")
		.text("Number of Accidents");
	
	//line generator
	var line = d3.line()
					.x(function(d, i) { return x(i); }) 
					.y(function(d) { return y(d.value); }) 
					.curve(d3.curveMonotoneX);

	//Append the path, bind the data, and call the line generator 
	svg.append("path")
		.datum(summarised_data.sort(function(a, b) { return a.key - b.key; })) 
		.attr("d", line)
		.attr("class", "line") 
		.attr("transform", "translate(" + margin.left + ", " + margin.top + ")"); 


	//div for tooltip
	var div = d3.select('body')
				.append('div')
				.attr('class', 'tooltip')
				.style('opacity', 0);

	var hours = ["00.00","01.00","02.00","03.00","04.00","05.00","06.00","07.00","08.00","09.00","10.00","11.00","12.00",
					"13.00","14.00","15.00","16.00","17.00","18.00","19.00","20.00","21.00","22.00","23.00"];

	//append circle as point on line and tooltip
	svg.selectAll(".dot")
		.data(summarised_data.sort(function(a, b) { return a.key - b.key; }))
		.enter()
		.append("circle")
		.attr("class", "dot")
		.attr("cx", function(d, i) { return x(i) })
		.attr("cy", function(d) { return y(d.value) })
		.attr("r", 4)
		.attr("transform", "translate(" + margin.left + ", " + margin.top + ")")
		.on("mouseover", function(d,i) {		
			div.transition()		
				.duration(200)
				.style("opacity", .9);
			div.html(hours[i] + " : "  + d.value + " accidents")	
				.style('left', d3.event.pageX + 25 + 'px')
				.style('top', d3.event.pageY - 28 + 'px');
		})					
		.on("mouseout", function(d) {		
			div.transition()
				.duration(500)
				.style("opacity", 0);
		});
}
