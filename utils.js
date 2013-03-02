var Utils = {

    // Calculate the angle of a line in Radians.
    // 0 or 2*PI is straight upwards
    // 0.5*PI is leftwards
    // PI is downwards
    // 1.5*PI is rightwards
    calculateAngle: function (p1, p2) {
        var dx = p2[0] - p1[0];
        var dy = p2[1] - p1[1];
        return Math.atan2(dx, dy) + Math.PI;
    },

    // 'offset' is an integer that says "this is the nth line between these points"
    // and causes it to be drawn with a more extreme curve so as not to obscure other lines
    // connecting the same points.
    generateCurve: function (p1, p2, offset) {
        // scale the offset by line length. Longer lines shouldn't
        // be so curvy.
        var space = 3;
        var adjustedOffset = offset / this.calculateDistance(p1, p2) * space;
        var curviness = 0.2 + adjustedOffset;

        var start = p1[0] + ' ' + p1[1];
        var via = this.calculateVia(p1, p2, curviness);
        var end = p2[0] + ' ' + p2[1];
        return ['M', start, 'Q', via, end].join(' ');
    },

    calculateDistance: function (p1, p2) {
        var dx = p2[0] - p1[0];
        var dy = p2[1] - p1[1];
        return Math.sqrt(dx*dx + dy*dy);
    },

    calculateVia: function (p1, p2, curviness) {
        var midpoint = this.calculateMidpoint(p1, p2);
        var dx = p2[0] - p1[0];
        var dy = p2[1] - p1[1];
        // extends at a right angle from the midpoint.
        // distance is modulated by 'curviness' value.
        return [
            midpoint[0] + curviness * dy,
            midpoint[1] - curviness * dx
        ];
    },

    calculateMidpoint: function (p1, p2) {
        return [
            (p1[0] + p2[0]) / 2,
            (p1[1] + p2[1]) / 2
        ];
    }

};
