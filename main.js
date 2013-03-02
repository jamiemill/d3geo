var width = 960,
    height = 500;

var projection = d3.geo.equirectangular()
    .scale(190)
    .translate([360, 270]);

var path = d3.geo.path()
    .projection(projection);

var graticule = d3.geo.graticule();

var svg = d3.select("body").append("svg")
    .attr("class", 'world')
    .attr("width", width)
    .attr("height", height);

var gradient = svg.append("defs")
    .append("linearGradient")
    .attr("id", "ideagrad");

gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#00acf0");
gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#ec6b10");

svg.append("path")
    .datum(graticule.outline)
    .attr("class", "background")
    .attr("d", path);

$.when(
    $.getJSON('world-110m.json'),
    $.get('country_latlon.csv'),
    $.get('currencies.csv'),
    $.get('fxideas.csv')
).done(function(worldXHR, locationsXHR, currenciesXHR, fxIdeasXHR) {
    renderMap(worldXHR[0]);
    renderIdeas({
        locations: d3.csv.parse(locationsXHR[0]),
        ideas: d3.csv.parse(fxIdeasXHR[0]),
        currencies: d3.csv.parse(currenciesXHR[0])
    });
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

function currencyCodeToLocation(currencyCode, currencies, locations) {
    var currency = _.find(currencies, function(currency) { return currency.code === currencyCode; });
    var countryCode = currency.country;
    if (countryCode === 'EU') {
        countryCode = 'FR';
    }
    return _.find(locations, function(country) { return country['iso 3166 country'] === countryCode; });
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
    var rectWidth = 22;
    var rectHeight = 11;
    _.each(currencies, function(currency) {
        xy = currencyCodeToXY(currency, options.currencies, options.locations);
        svg.append("rect")
            .attr("x", xy[0] - rectWidth/2)
            .attr("y", xy[1] - rectHeight/2)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("width", rectWidth)
            .attr("height", rectHeight)
            .attr("class", "country-point");
        svg.append("text")
            .attr("class", "label")
            .attr("x", xy[0])
            .attr("y", xy[1] + 3)
            .attr("text-anchor", "middle")
            .text(currency);
    });
}

function renderIdeas(options) {
    d3.select('.world').selectAll('.idea')
        .data(options.ideas)
        .enter()
        .append('path')
        .attr('class', 'idea')
        .attr('stroke', 'url(#ideagrad)')
        .attr('d', function(d) {
            var baseCurrencyXY = currencyCodeToXY(d['Base Currency'], options.currencies, options.locations);
            var quoteCurrencyXY = currencyCodeToXY(d['Quote Currency'], options.currencies, options.locations);
            var start;
            var end;
            // 'base' is the one on the left, e.g. EUR in EURGBP.
            // that's the one the direction applies to.
            if (d.Direction === 'Buy') {
                start = baseCurrencyXY;
                end = quoteCurrencyXY;
            } else {
                start = quoteCurrencyXY;
                end = baseCurrencyXY;
            }
            var n = countOthersBefore(options.ideas, d);
            return generateCurve(start, end, n);
        });
}

function countOthersBefore(ideas, idea) {
    return _.indexOf(
        _.filter(ideas, function(_idea) {
            return _idea['Base Currency'] === idea['Base Currency'] &&
                _idea['Quote Currency'] === idea['Quote Currency'];
        }),
        idea
    );
}

// 'offset' is an integer that says "this is the nth line between these points"
// and causes it to be drawn with a more extreme curve so as not to obscure other lines
// connecting the same points.
function generateCurve(p1, p2, offset) {
    // scale the offset by line length. Longer lines shouldn't
    // be so curvy.
    var space = 3;
    var adjustedOffset = offset / calculateDistance(p1, p2) * space;
    var curviness = 0.2 + adjustedOffset;

    var start = p1[0] + ' ' + p1[1];
    var via = calculateVia(p1, p2, curviness);
    var end = p2[0] + ' ' + p2[1];
    return ['M', start, 'Q', via, end].join(' ');
}

function calculateDistance(p1, p2) {
    var dx = p2[0] - p1[0];
    var dy = p2[1] - p1[1];
    return Math.sqrt(dx*dx + dy*dy);
}

function calculateVia(p1, p2, curviness) {
    var midpoint = calculateMidpoint(p1, p2);
    var dx = p2[0] - p1[0];
    var dy = p2[1] - p1[1];
    // extends at a right angle from the midpoint.
    // distance is modulated by 'curviness' value.
    return [
        midpoint[0] + curviness * dy,
        midpoint[1] - curviness * dx
    ];
}

function calculateMidpoint(p1, p2) {
    return [
        (p1[0] + p2[0]) / 2,
        (p1[1] + p2[1]) / 2
    ];
}
