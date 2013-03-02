var width = 960,
    height = 500;

var projection = d3.geo.equirectangular()
    .scale(150);

var path = d3.geo.path()
    .projection(projection);

var graticule = d3.geo.graticule();

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

svg.append("path")
    .datum(graticule.outline)
    .attr("class", "background")
    .attr("d", path);

svg.append("g")
    .attr("class", "graticule")
  .selectAll("path")
    .data(graticule.lines)
  .enter().append("path")
    .attr("d", path);

svg.append("path")
    .datum(graticule.outline)
    .attr("class", "foreground")
    .attr("d", path);


$.when(
    $.getJSON('world-110m.json'),
    $.get('country_latlon.csv')
).done(function(worldXHR, countryLocationsXHR) {
    renderMap(worldXHR[0]);
    renderDots(d3.csv.parse(countryLocationsXHR[0]));
});

function renderMap(world) {
  svg.insert("path", ".graticule")
      .datum(topojson.object(world, world.objects.land))
      .attr("class", "land")
      .attr("d", path);
  svg.insert("path", ".graticule")
      .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a.id !== b.id; }))
      .attr("class", "boundary")
      .attr("d", path);
}

function renderDots(countryLocations) {
    var countriesToPlot = ['US', 'GB', 'JP', 'BR'];
    _.each(countriesToPlot, function(countryToPlot) {
      var country = _.find(countryLocations, function(country) { return country['iso 3166 country'] === countryToPlot; });
      var countryLocation = projection([country.longitude, country.latitude]);
      svg.append("circle")
        .attr("cx", countryLocation[0])
        .attr("cy", countryLocation[1])
        .attr("r", 10)
        .attr("class", "country-point");
    });
}
