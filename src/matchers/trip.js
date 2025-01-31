const turf = require("@turf/turf");
const h3 = require("h3-js");
const cover = require("@mapbox/tile-cover");

const z = 19;
const zs = { min_zoom: z, max_zoom: z };

module.exports = async function(trip, config, graph) {
  const line = turf.lineString(
    trip.route.features.map(pt => {
      return pt.geometry.coordinates;
    })
  );

  // STREETS

  if (!trip.matches) trip.matches = {};

  const match = await graph.matchTrace(line);

  if (
    match &&
    match.segments &&
    match.matchedPath &&
    match.matchedPath.geometry &&
    match.matchedPath.geometry.coordinates &&
    match.matchedPath.geometry.coordinates.length === match.segments.length
  ) {
    trip.matches.streets = match;
  }

  // HEXES

  var bins = {};
  trip.route.features.forEach(ping => {
    var bin = h3.geoToH3(
      ping.geometry.coordinates[1],
      ping.geometry.coordinates[0],
      config.Z
    );
    bins[bin] = 1;
  });

  trip.matches.bins = bins;

  // ZONES

  if (config.zones) {
    var zoneMatches = [];
    const keys = cover.indexes(line.geometry, zs);
    for (let zone of config.zones.features) {
      let found = false;
      for (let key of keys) {
        if (zone.properties.keys[key]) found = true;
        continue;
      }

      if (found) {
        zoneMatches.push(zone.properties.id);
      }
    }

    if (zoneMatches.length) {
      trip.matches.zones = zoneMatches;
    }
  }

  return trip;
};
