
function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}

function stateAccidentMap(data) {

	const state_accidents = document.getElementById('stateAccidents');

	// flush the previous content
	if(state_accidents.childNodes.length > 0){
	  while(state_accidents.firstElementChild){ state_accidents.firstElementChild.remove(); }
	}

	// group the data by state
	accidentCountByState = d3.nest()
												   .key(function(d) { return d.State; })
												   .rollup(function(v) { return v.length; })
												   .entries(data);

	//set the dimension and height of #stateAccidents
	var margin = {top: 10, right: 30, bottom: 30, left: 30};
	var width = 520 - margin.left - margin.right;
	var height = 320 - margin.top - margin.bottom;

	//Define map projection
	var projection = d3.geoAlbersUsa()
						  			 .translate([width/2, height/2])
						   			 .scale([600]);

	//Define path generator
	var USpath = d3.geoPath()
					 		 .projection(projection);
					 
	//Define linear scale to sort data values into buckets of color
	var lowColor = '#eff3ff'
	var highColor = '#08519c'
	var color = d3.scaleLinear()
								.range([lowColor, highColor]);


	// append the svg object to #stateAccidents
	var svg = d3.select("#stateAccidents")
							.append("svg")
							.attr("width", width + margin.left + margin.right)
							.attr("height", height + margin.top + margin.bottom)
							.attr("transform", "translate(" + (margin.left+30) + "," + margin.top + " )" );

	//Set input domain for color scale
	color.domain([
		d3.min(accidentCountByState, function(d) { return d.value; }), 
		d3.max(accidentCountByState, function(d) { return d.value; })
	]);

	//Load in GeoJSON data
	d3.json("data/us-states.json").then(function(json) {

		//Merge the accident data and GeoJSON
		//Loop through once for each accident data value
		for (var i = 0; i < accidentCountByState.length; i++) {

			//Grab state name
			var dataState = accidentCountByState[i].key;
			var stateName = abbrState(dataState, 'name');
			
			//Grab data value, and convert from string to float
			var dataValue = parseFloat(accidentCountByState[i].value);
	
			//Find the corresponding state inside the GeoJSON
			for (var j = 0; j < json.features.length; j++) {
			
				var jsonState = json.features[j].properties.name;
	
				if (stateName == jsonState) {
					//Copy the data value into the JSON
					json.features[j].properties.value = dataValue;
					//Stop looking through the JSON
					break;
				}
			}		
		}

		// Define the div for the tooltip
		var div = d3
								  .select('body')
								  .append('div')
								  .attr('class', 'tooltip')
								  .style('opacity', 0);

		//Bind data and create one path per GeoJSON feature
		svg.selectAll("path")
		   .data(json.features)
		   .enter()
		   .append("path")
		   .attr("d", USpath)
		   .attr("class", "state")
		   .style("fill", function(d) {
		   		//Get data value
		   		var value = d.properties.value;
		   		
		   		if (value) {
		   			//If value exists…
			   		return color(value);
		   		} else {
		   			//If value is undefined…
			   		return "#ccc";
		   		}
		   })
		   .on('mouseover', d => {
		      div
		        .transition()
		        .duration(200)
		        .style('opacity', 0.9);
		      div
		        .html("State: " + d.properties.name + "<br>Number of Accidents: " + d.properties.value)
		        .style('left', d3.event.pageX + 25 + 'px')
		        .style('top', d3.event.pageY - 28 + 'px');
		    })
		    .on('mouseout', () => {
		      div
		        .transition()
		        .duration(500)
		        .style('opacity', 0);
		    })
		    .on('click', d => {
		    	// display the popup box
		    	modal.style.display = "block";

		    	// no popup box for null value state
				  if (d.properties.value == null) {
				  	modal.style.display = "none";
				  }

				  // display the state name of the selected state
				  const state_name = document.getElementById('stateName');
				  // flush the previous content
					if(state_name.childNodes.length > 0){
					  while(state_name.firstElementChild){ state_name.firstElementChild.remove(); }
					}

				  d3.select('#stateName')
				  	.append('text')
				  	.text('State: ' + d.properties.name);


		    	/******* #weatherConditions *******/
		    	stateWeatherBar(d, data);

					/******* #severity *******/
					stateSeverityBar(d, data);

		    });

		var modal = document.getElementById("stateContainer");
		var span = document.getElementsByClassName("close")[0];

		// When the user clicks on <span> (x), close the modal
		span.onclick = function() {
		  modal.style.display = "none";
		}

		// When the user clicks anywhere outside of the modal, close it
		window.onclick = function(event) {
		  if (event.target == modal) {
		    modal.style.display = "none";
		  }
		}

		// add a legend for #stateAccidents
		var w = 60, h = 300;

		var key = d3.select("#stateAccidents")
			.append("svg")
			.attr("width", w)
			.attr("height", h+20)
			.attr("class", "legend");

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
							.domain([0, d3.max(accidentCountByState, function(d) { return d.value; })])
							.nice();

		var yAxis = d3.axisRight(y)
									.tickFormat(d3.format(".3s"));

		key.append("g")
			.attr("class", "y axis")
			.attr("transform", "translate(11,30)")
			.call(yAxis);

	});
}

function stateWeatherBar(json, data) {

	const content_weather = document.getElementById('weatherConditions');
		    	
	// flush the previous content
	if(content_weather.childNodes.length > 0){
	  while(content_weather.firstElementChild){ content_weather.firstElementChild.remove(); }
	}

	const weather_graph_title = document.getElementById('weatherGraphTitle');

  // flush the previous content
	if(weather_graph_title.childNodes.length > 0){
	  while(weather_graph_title.firstElementChild){ weather_graph_title.firstElementChild.remove(); }
	}

  // display the selected graph title for #weatherConditions
  d3.select('#weatherGraphTitle')
  	.append('text')
  	.text('Top 5 Weathers that Caused Accidents in ' + json.properties.name);

  var margin = {top: 10, right: 30, bottom: 30, left: 30};
	var widthWeatherGraph = 420 - margin.left - margin.right;
	var heightWeatherGraph = 250 - margin.top - margin.bottom;

	var weatherDetails = d3.select("#weatherConditions");

	const weatherChart = weatherDetails
											.append('svg')
    									.attr("width", widthWeatherGraph + margin.left + margin.right)
    									.attr("height", heightWeatherGraph + margin.top + margin.bottom*2)
    									.attr("transform", "translate(0,0)");

  // group the data by weather
	accidentCountByWeather = d3.nest()
												   .key(function(d) { return d.State; })
												   .key(function(d) { return d.Weather_Condition; })
												   .rollup(function(v) { return v.length; })
												   .entries(data);

	for (var i=0; i<accidentCountByWeather.length; i++) {
		if (abbrState(accidentCountByWeather[i].key, 'name') == json.properties.name) {
			particularStateWeather = accidentCountByWeather[i].values;
		}
	}

	// extract the top 5 weather conditions
	topData = particularStateWeather.sort(function(a, b) {
	  return d3.descending(a.value, b.value)
	}).slice(0, 5);

	var xScaleWeather = d3.scaleBand()
										    .domain(topData.map(function(o){return o.key})) 
										    .rangeRound([0, widthWeatherGraph])
										    .padding(0.1); 

	var yScaleWeather = d3.scaleLinear()
										    .domain([0, d3.max(topData, function(d) { return d.value; })])
										    .rangeRound([heightWeatherGraph, 0])
										    .nice(); 

	xAxisWeather = d3.axisBottom(xScaleWeather);

	yAxisWeather = d3.axisLeft(yScaleWeather)
									 .tickFormat(d3.format(".2s"));

  // call x-axis of #weatherConditions
  weatherChart.append("g")
								.attr("transform", "translate(" + (margin.left+15) + " ," + (heightWeatherGraph+margin.top*3) + ")")
								.call(xAxisWeather)
								.selectAll(".tick text")
									.call(wrap, xScaleWeather.bandwidth());

	weatherChart.append('text')
								.attr("transform", "translate(" + (widthWeatherGraph/2+margin.left+15) + " ," + (heightWeatherGraph+margin.top*6) + ")")
					      .attr("dy", ".75em")
					      .style("text-anchor", "middle")
					      .style("font-size", "10px")
								.text('Type of Weather');
								

	// call y-axis of #weatherConditions and append y-axis label
	weatherChart.append("g")
								.call(yAxisWeather)
    						.attr("transform", "translate(" + (margin.left+15) + ", " + margin.top*3 + ")")
								.append("text")
									.attr("fill", "#000")
									.attr("transform", "rotate(-90)")
									.attr("x", -60)
									.attr("y", -40)
									.attr("dy", "0.75em")
									.attr("text-anchor", "end")
									.text("Number of Accidents");

	const weatherBar = weatherChart.selectAll()
													      .data(topData)
													      .enter()
													      .append('g')

	// append the bars to chart
	weatherBar.append("rect")
							.attr("class", "bar")
							.attr("x", function (d) {
								return xScaleWeather(d.key);
							})
							.attr("y", function (d) {
								return yScaleWeather(d.value);
							})
							.attr("width", xScaleWeather.bandwidth())
							.attr("height", function (d) {
								return heightWeatherGraph - yScaleWeather(d.value);
							})
							.attr("transform", "translate(" + (margin.left+15) + ", " + margin.top*3 + ")")
							.on('mouseenter', function (d, i) {
				        d3.selectAll('.w_value')
				          .attr('opacity', 0)

				        d3.select(this)
				          .transition()
				          .duration(300)
				          .attr('opacity', 0.6)
				          .attr('x', (a) => xScaleWeather(a.key) + 5)
				          .attr('width', xScaleWeather.bandwidth() - 10)

				        weatherBar.append('text')
									          .attr('class', 'w_divergence')
									          .attr('x', (a) => xScaleWeather(a.key) + xScaleWeather.bandwidth() / 2)
									          .attr('y', (a) => yScaleWeather(a.value) + 30)
									          .attr('fill', 'black')
									          .attr('transform', 'translate(' + (margin.left+15) + ', -3)')
									          .attr('text-anchor', 'middle')
									          .text((a, idx) => {
									            const divergence = parseFloat((a.value - d.value)/json.properties.value * 100).toFixed(1)
									            
									            let text = ''
									            if (divergence > 0) text += '+'
									            text += `${divergence}`+'%'

									            return idx !== i ? text : '';
									          })

									      })
				      .on('mouseleave', function () {
				        d3.selectAll('.w_value')
				          .attr('opacity', 1)

				        d3.select(this)
				          .transition()
				          .duration(300)
				          .attr('opacity', 1)
				          .attr('x', (a) => xScaleWeather(a.key))
				          .attr('width', xScaleWeather.bandwidth())

				        weatherChart.selectAll('#limit').remove()
				        weatherChart.selectAll('.w_divergence').remove()
				      });

	weatherBar.append('text')
			      .attr('class', 'w_value')
			      .attr('x', (a) => xScaleWeather(a.key) + xScaleWeather.bandwidth() / 2)
			      .attr('y', (a) => yScaleWeather(a.value) + 30)
			      .attr('transform', 'translate(' + (margin.left+15) + ', -3)')
			      .attr('text-anchor', 'middle')
			      .text((a) => parseFloat(a.value/json.properties.value*100).toFixed(1) + '%')	

}

function stateSeverityBar(json, data) {

	const severity_graph_title = document.getElementById('severityGraphTitle');

  // flush the previous graph title
	if(severity_graph_title.childNodes.length > 0){
	  while(severity_graph_title.firstElementChild){ severity_graph_title.firstElementChild.remove(); }
	}

	const content_severity = document.getElementById('severity');

	// flush the previous content
	if(content_severity.childNodes.length > 0){
	  while(content_severity.firstElementChild){ content_severity.firstElementChild.remove(); }
	}

	// display the selected graph title for #severity
  d3.select('#severityGraphTitle')
  	.append('text')
  	.text('Severity of Accidents Happened in ' + json.properties.name);

  var margin = {top: 10, right: 30, bottom: 30, left: 30};
	var widthSeverityGraph = 370 - margin.left - margin.right;
	var heightSeverityGraph = 250 - margin.top - margin.bottom;

	var severityDetails = d3.select("#severity");

	const severityChart = severityDetails
    											.append('svg')
		    									.attr("width", widthSeverityGraph + margin.left + margin.right)
		    									.attr("height", heightSeverityGraph + margin.top + margin.bottom*2)
		    									.attr("transform", "translate(0,0)");

	// group the data by severity
	accidentCountBySeverity = d3.nest()
												   .key(function(d) { return d.State; })
												   .key(function(d) { return d.Severity; })
												   .rollup(function(v) { return v.length; })
												   .entries(data);

	for (var i=0; i<accidentCountBySeverity.length; i++) {
		if (abbrState(accidentCountBySeverity[i].key, 'name') == json.properties.name) {
			particularStateSeverity = accidentCountBySeverity[i].values;
		}
	}

	particularStateSeverity = particularStateSeverity.sort(function(a, b) {
	  return a.key-b.key;
	});

	var xScaleSeverity = d3.scaleBand()
										    .domain(particularStateSeverity.map(function(d){return d.key})) 
										    .rangeRound([0, widthSeverityGraph])
										    .padding(0.1); 

	var yScaleSeverity = d3.scaleLinear()
										    .domain([0, d3.max(particularStateSeverity, function(d) { return d.value; })])
										    .rangeRound([heightSeverityGraph, 0])
										    .nice(); 

	xAxisSeverity = d3.axisBottom(xScaleSeverity);

	yAxisSeverity = d3.axisLeft(yScaleSeverity)
									 .tickFormat(d3.format(".2s"));

  // call x-axis of #severity
  severityChart.append("g")
								.attr("transform", "translate(" + (margin.left+15) + " ," + (heightSeverityGraph+margin.top*3) + ")")
								.call(xAxisSeverity);

	severityChart.append('text')
								.attr("transform", "translate(" + (widthSeverityGraph/2+margin.left+15) + " ," + (heightSeverityGraph+margin.top*6) + ")")
					      .attr("dy", ".75em")
					      .style("text-anchor", "middle")
					      .style("font-size", "10px")
								.text('Type of Severity');
								

	// call y-axis of #severity and append y-axis label
	severityChart.append("g")
								.call(yAxisSeverity)
    						.attr("transform", "translate(" + (margin.left+15) + ", " + margin.top*3 + ")")
								.append("text")
									.attr("fill", "#000")
									.attr("transform", "rotate(-90)")
									.attr("x", -60)
									.attr("y", -40)
									.attr("dy", "0.75em")
									.attr("text-anchor", "end")
									.text("Number of Accidents");

	const severityBar = severityChart.selectAll()
														      .data(particularStateSeverity)
														      .enter()
														      .append('g')

	// append the bars to chart
	severityBar.append("rect")
							.attr("class", "bar")
							.attr("x", function (d) {
								return xScaleSeverity(d.key);
							})
							.attr("y", function (d) {
								return yScaleSeverity(d.value);
							})
							.attr("width", xScaleSeverity.bandwidth())
							.attr("height", function (d) {
								return heightSeverityGraph - yScaleSeverity(d.value);
							})
							.attr("transform", "translate(" + (margin.left+15) + ", " + margin.top*3 + ")")
							.on('mouseenter', function (d, i) {
				        d3.selectAll('.s_value')
				          .attr('opacity', 0)

				        d3.select(this)
				          .transition()
				          .duration(300)
				          .attr('opacity', 0.6)
				          .attr('x', (a) => xScaleSeverity(a.key) + 5)
				          .attr('width', xScaleSeverity.bandwidth() - 10)

				        severityBar.append('text')
									          .attr('class', 's_divergence')
									          .attr('x', (a) => xScaleSeverity(a.key) + xScaleSeverity.bandwidth() / 2)
									          .attr('y', (a) => yScaleSeverity(a.value) + 30)
									          .attr('fill', 'black')
									          .attr('transform', 'translate(' + (margin.left+15) + ', -3)')
									          .attr('text-anchor', 'middle')
									          .text((a, idx) => {
									            const divergence = parseFloat((a.value - d.value)/json.properties.value*100).toFixed(1)
									            
									            let text = ''
									            if (divergence > 0) text += '+'
									            text += `${divergence}` + '%'

									            return idx !== i ? text : '';
									          })

									      })
				      .on('mouseleave', function () {
				        d3.selectAll('.s_value')
				          .attr('opacity', 1)

				        d3.select(this)
				          .transition()
				          .duration(300)
				          .attr('opacity', 1)
				          .attr('x', (a) => xScaleSeverity(a.key))
				          .attr('width', xScaleSeverity.bandwidth())

				        severityChart.selectAll('#limit').remove()
				        severityChart.selectAll('.s_divergence').remove()
				      });

	severityBar.append('text')
			      .attr('class', 's_value')
			      .attr('x', (a) => xScaleSeverity(a.key) + xScaleSeverity.bandwidth() / 2)
			      .attr('y', (a) => yScaleSeverity(a.value) + 30)
			      .attr('transform', 'translate(' + (margin.left+15) + ', -3)')
			      .attr('text-anchor', 'middle')
			      .text((a) => parseFloat(a.value/json.properties.value*100).toFixed(1) + '%');
}

function monthAccidentLine(data) {

	const month_accidents = document.getElementById('monthAccidents');

	// flush the previous content
	if(month_accidents.childNodes.length > 0){
	  while(month_accidents.firstElementChild){ month_accidents.firstElementChild.remove(); }
	}

	// split the date time of #monthAccidents 
	data.forEach(function(d) {
    a = d.Start_Time.split(" ",1);
    b = a[0].split("-");
    d.year = b[0]*1;
    d.month = b[1]*1;
    d.day = b[2]*1;  
  });

	// group the data by month
	accidentCountByMonth = d3.nest()
												   .key(function(d) { return d.month; })
												   .rollup(function(v) { return v.length; })
												   .entries(data);

	// the number of data points
	var margin = {top: 10, right: 30, bottom: 30, left: 30};
	var widthMonthGraph = 500 - margin.left - margin.right;
	var heightMonthGraph = 350 - margin.top - margin.bottom*2;

	var xScale = d3.scaleTime()
						    .domain([0,11]) // input
						    .range([0, widthMonthGraph]); // output

	var yScale = d3.scaleLinear()
						    .domain(d3.extent(accidentCountByMonth, function(d) { return d.value; }))
						    .range([heightMonthGraph, 0])
						    .nice(); // output 

	var line = d3.line()
					    .x(function(d, i) { return xScale(i); }) // set the x values for the line generator
					    .y(function(d) { return yScale(d.value); }) // set the y values for the line generator 
					    .curve(d3.curveMonotoneX);

	var monthGraph = d3.select("#monthAccidents")
										 .append("svg")
									     .attr("width", widthMonthGraph + margin.left + margin.right)
									     .attr("height", heightMonthGraph + margin.top*2 + margin.bottom)
									   .append("g")
									     .attr("transform", "translate(" + margin.left + ", 0)");

	// labels for x-axis of #monthAccidents
	var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

	var formatMonth = function (d) {
		return months[d%12];
	}

	xAxisMonth = d3.axisBottom(xScale)
								 .tickFormat(formatMonth);

	// append x-axis for graph #monthAccidents
	monthGraph.append("g")
				    .attr("class", "x axis")
				    .attr("transform", "translate(10," + (heightMonthGraph+margin.top) + ")")
				    .call(xAxisMonth); 

	// text label for the x axis
  monthGraph.append("text")             
			      .attr("transform",
			            "translate(" + (widthMonthGraph+10) + " ," + 
			                           (heightMonthGraph) + ")")
			      .attr("dy", ".75em")
			      .style("text-anchor", "end")
			      .style("font-size", "10px")
			      .text("Month");

	yAxisMonth = d3.axisLeft(yScale)
								 .tickFormat(d3.format(".3s"));

	// Define the div for the tooltip
	var div = d3
						  .select('body')
						  .append('div')
						  .attr('class', 'tooltip')
						  .style('opacity', 0);

	// append y-axis for graph #monthAccidents
  monthGraph.append("g")
				    .attr("class", "y axis")
				    .attr("transform", "translate(10, " + margin.top + ")")
				    .call(yAxisMonth); 

	monthGraph.append("text")
			      .attr("transform", "rotate(-90)")
			      .attr("x", -10)
			      .attr("y", 14)
			      .attr("dy", "1em")
			      .style("text-anchor", "end")
			      .style("font-size", "10px")
			      .text("Number of Accidents");      

  monthGraph.append("path")
				    .datum(accidentCountByMonth.sort(function(a, b) { return a.key - b.key; })) // sort data by acsending of Months
				    .transition()
				    .duration(1000)
				    .attr("class", "line") // Assign a class for styling 
				    .attr("transform", "translate(10, " + margin.top + ")")
				    .attr("d", line);

	monthGraph.selectAll(".dot")
				    .data(accidentCountByMonth.sort(function(a, b) { return a.key - b.key; }))
					  .enter()
					  .append("circle") // Uses the enter().append() method
				    .attr("class", "dot") // Assign a class for styling
				    .attr("cx", function(d, i) { return xScale(i) })
				    .attr("cy", function(d) { return yScale(d.value) })
				    .attr("r", 4)
				    .attr("transform", "translate(10, " + margin.top + ")")
				    .on("mouseover", function(d,i) {		
	            div.transition()		
	                .duration(200)		
	                .style("opacity", .9);		
	            div	.html(months[i] + ": "  + d.value + " accidents")	
	                .style('left', d3.event.pageX + 25 + 'px')
		        			.style('top', d3.event.pageY - 28 + 'px');
	            })					
		        .on("mouseout", function(d) {		
		            div.transition()		
		                .duration(500)
		                .style("opacity", 0);	
		        });
}

