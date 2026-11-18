'use strict';

// Address -> coordinates adapter. Uses Google Geocoding when
// GOOGLE_MAPS_API_KEY is set, otherwise accepts caller-supplied coordinates
// (and never blocks a save on a third-party outage).
async function geocodeAddress(address, fallback) {
  const formatted = [
    address?.street,
    address?.area,
    address?.city,
    address?.state,
    address?.country,
  ].filter(Boolean).join(', ');

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (key && formatted) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formatted)}&key=${key}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const body = await response.json().catch(() => null);
      const point = body?.results?.[0]?.geometry?.location;
      if (body?.status === 'OK' && point) {
        return { coordinates: [point.lng, point.lat], formattedAddress: formatted };
      }
    } catch {
      // Fall through to caller-supplied coordinates.
    }
  }

  if (Array.isArray(fallback) && fallback.length === 2
    && Number.isFinite(Number(fallback[0])) && Number.isFinite(Number(fallback[1]))) {
    return { coordinates: [Number(fallback[0]), Number(fallback[1])], formattedAddress: formatted };
  }
  return formatted ? { coordinates: null, formattedAddress: formatted } : null;
}

module.exports = { geocodeAddress };
