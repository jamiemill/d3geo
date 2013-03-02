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

generateDirectionalGradients();

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
        .attr('stroke', function(d) {
            var isShort = d.Direction === 'Sell';
            return pickGradient(d, options.currencies, options.locations, isShort);
        })
        .attr('d', function(d) {
            var points = getStartAndEndPoints(d, options.currencies, options.locations);
            var n = countOthersBefore(options.ideas, d);
            return Utils.generateCurve(points[0], points[1], n);
        });
}

function pickGradient(idea, currencies, locations, isShort) {
    var points = getStartAndEndPoints(idea, currencies, locations);
    if (isShort) {
        points = points.reverse();
    }
    return _pickGradient(points[0], points[1]);
}

function _pickGradient(p1, p2) {
    var angleRadians = Utils.calculateAngle(p1, p2);
    var sector = Math.round(angleRadians/(2*Math.PI)*4);
    if (sector === 4) {
        sector = 0;
    }
    return 'url(#ideagrad-'+sector+')';
}

function getStartAndEndPoints(idea, currencies, locations) {
    var baseCurrencyXY = currencyCodeToXY(idea['Base Currency'], currencies, locations);
    var quoteCurrencyXY = currencyCodeToXY(idea['Quote Currency'], currencies, locations);
    return [baseCurrencyXY, quoteCurrencyXY];
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

function generateDirectionalGradients() {
    // Create four gradients, one facing right,
    // down, left and up.
    var defs = svg.append("defs");
    var grads = [];
    for(var i=0; i<4; i++) {
        var grad = defs.append("linearGradient");
        grad
            .attr("y1", "0%")
            .attr("y2", "0%")
            .attr("x1", "0%")
            .attr("x2", "0%")
            .attr("id", "ideagrad-"+i);
        grad.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#00acf0");
        grad.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#ec6b10");
        grads.push(grad);
    }
    // up
    grads[0].attr("y1", "100%");
    // left
    grads[1].attr("x1", "100%");
    // down
    grads[2].attr("y2", "100%");
    // right
    grads[3].attr("x2", "100%");
}
