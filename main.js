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
    $.get('country_latlon.csv'),
    $.get('currencies.csv'),
    $.get('fxideas.csv')
).done(function(worldXHR, locationsXHR, currenciesXHR, fxIdeasXHR) {
    renderMap(worldXHR[0]);
    renderDots({
        locations: d3.csv.parse(locationsXHR[0]),
        ideas: d3.csv.parse(fxIdeasXHR[0]),
        currencies: d3.csv.parse(currenciesXHR[0])
    });
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

function currencyToLocation(currencyCode, currencies, locations) {
    var currency = _.find(currencies, function(currency) { return currency.code === currencyCode; });
    return _.find(locations, function(country) { return country['iso 3166 country'] === currency.country; });
}

function ideasToUniqueCurrencies(ideas) {
    return _(ideas).chain()
      .map(function(idea) { return [idea['Base Currency'], idea['Quote Currency']]; })
      .flatten()
      .uniq()
      .value();
}

function renderDots(options) {
    var currencies = ideasToUniqueCurrencies(options.ideas);
    _.each(currencies, function(currency) {
      var location = currencyToLocation(currency, options.currencies, options.locations);
      var xy = projection([location.longitude, location.latitude]);
      svg.append("circle")
        .attr("cx", xy[0])
        .attr("cy", xy[1])
        .attr("r", 4)
        .attr("class", "country-point");
    });
}
