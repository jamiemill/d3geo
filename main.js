var width = 960,
    height = 500;

var projection = d3.geo.equirectangular()
    .scale(150);

var path = d3.geo.path()
    .projection(projection);

var graticule = d3.geo.graticule();

var svg = d3.select("body").append("svg")
    .attr("class", 'world')
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
    renderIdeas({
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

function currencyCodeToLocation(currencyCode, currencies, locations) {
    var currency = _.find(currencies, function(currency) { return currency.code === currencyCode; });
    return _.find(locations, function(country) { return country['iso 3166 country'] === currency.country; });
}

function currencyCodeToXY(currencyCode, currencies, locations) {
    var location = currencyCodeToLocation(currencyCode, currencies, locations);
    return  projection([location.longitude, location.latitude]);
}

function ideasToUniqueCurrencies(ideas) {
    return _(ideas).chain()
        .map(function(idea) { return [idea['Base Currency'], idea['Quote Currency']]; })
        .flatten()
        .uniq()
        .value();
}

// Todo: rewrite as data-driven?
function renderDots(options) {
    var currencies = ideasToUniqueCurrencies(options.ideas);
    _.each(currencies, function(currency) {
        xy = currencyCodeToXY(currency, options.currencies, options.locations);
        svg.append("circle")
            .attr("cx", xy[0])
            .attr("cy", xy[1])
            .attr("r", 4)
            .attr("class", "country-point");
        svg.append("text")
            .attr("class", "label")
            .attr("x", xy[0] - 8)
            .attr("y", xy[1] - 5)
            .text(currency);
    });
}

function renderIdeas(options) {
    d3.select('.world').selectAll('.idea')
        .data(options.ideas)
        .enter()
        .append('path')
        .attr('class', 'idea')
        .attr('d', function(d) {
            var baseCurrencyXY = currencyCodeToXY(d['Base Currency'], options.currencies, options.locations);
            var quoteCurrencyXY = currencyCodeToXY(d['Quote Currency'], options.currencies, options.locations);
            return generateCurve(baseCurrencyXY, quoteCurrencyXY);
        });
}

function generateCurve(p1, p2) {
    var start = p1[0] + ' ' + p1[1];
    var via = calculateVia(p1, p2);
    var end = p2[0] + ' ' + p2[1];
    return ['M', start, 'Q', via, end].join(' ');
}

function calculateVia(p1, p2) {
    var midpoint = calculateMidpoint(p1, p2);
    var dx = p2[0] - p1[0];
    var dy = p2[1] - p1[1];
    var straightness = 4;
    // extends at a right angle from the midpoint.
    // distance is modulated by 'straightness' value.
    return [
        midpoint[0] + dy/straightness,
        midpoint[1] - dx/straightness
    ];
}

function calculateMidpoint(p1, p2) {
    return [
        (p1[0] + p2[0]) / 2,
        (p1[1] + p2[1]) / 2
    ];
}
