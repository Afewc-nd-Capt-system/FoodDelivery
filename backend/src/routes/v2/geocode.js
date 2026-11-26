'use strict';

const express = require('express');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();

function pickComponent(components, type, useShort) {
  const entry = (components || []).find((item) => (item.types || []).includes(type));
  if (!entry) return '';
  return useShort ? (entry.short_name || entry.long_name || '') : (entry.long_name || entry.short_name || '');
}

// GET /api/v2/geocode/reverse?lat=..&lng=..
// Server-side reverse geocode so the browser never needs a provider key.
router.get('/reverse', authMiddleware, async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: 'Valid lat and lng are required' });
  }

  const empty = { street: '', area: '', city: '', state: '', lat, lng };
  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (key) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const body = await response.json().catch(() => null);
      const result = body?.results?.[0];
      if (body?.status === 'OK' && result) {
        const components = result.address_components || [];
        return res.json({
          street: [result.address_components ? pickComponent(components, 'route') : '', pickComponent(components, 'street_number')].filter(Boolean).join(' '),
          area: pickComponent(components, 'sublocality') || pickComponent(components, 'neighborhood'),
          city: pickComponent(components, 'locality') || pickComponent(components, 'administrative_area_level_2'),
          state: pickComponent(components, 'administrative_area_level_1'),
          lat,
          lng,
        });
      }
    } catch {
      // Fall through to the public fallback below.
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'VibeChops/1.0 (delivery address lookup)' },
      signal: AbortSignal.timeout(6000),
    });
    const body = await response.json().catch(() => null);
    const a = body?.address || {};
    return res.json({
      street: [a.road, a.house_number].filter(Boolean).join(' '),
      area: a.suburb || a.neighbourhood || a.city_district || '',
      city: a.city || a.town || a.village || a.municipality || '',
      state: a.state || '',
      lat,
      lng,
    });
  } catch {
    return res.json(empty);
  }
});

module.exports = router;
