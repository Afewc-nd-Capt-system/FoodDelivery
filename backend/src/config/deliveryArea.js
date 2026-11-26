'use strict';

// Single source of truth for delivery-service rules. Today the rule is the
// same city (and same state when a city is missing); radiusKm is intentionally
// configurable so a distance rule can be enabled without touching callers.
const SERVICE_AREA_RULE = {
  sameCity: true,
  sameState: true,
  radiusKm: null,
};

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeState(value) {
  const state = String(value || '').trim();
  return NIGERIAN_STATES.find((item) => normalize(item) === normalize(state)) || '';
}

function isValidPhone(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits.length >= 10 && digits.length <= 14;
}

function deliveryAddressError(message, code = 'INVALID_DELIVERY_ADDRESS') {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

function validateDeliveryAddress(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw deliveryAddressError('A complete delivery address is required (street, city, state and phone).');
  }

  const street = String(input.street || input.addressLine || '').trim();
  const area = String(input.area || input.landmark || '').trim();
  const city = String(input.city || '').trim();
  const state = normalizeState(input.state);
  const phone = String(input.phone || '').trim();
  const lat = Number(input.lat);
  const lng = Number(input.lng);

  if (!street) throw deliveryAddressError('Delivery street or landmark is required.');
  if (!city) throw deliveryAddressError('Delivery city is required.');
  if (!state) throw deliveryAddressError('Select a valid Nigerian state for delivery.');
  if (!isValidPhone(phone)) throw deliveryAddressError('A valid Nigerian contact phone number is required.');

  return {
    street,
    area,
    city,
    state,
    phone,
    ...(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
  };
}

function formatAddress(address) {
  return [address.street, address.area, address.city, address.state].filter(Boolean).join(', ');
}

function haversineKm(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

/**
 * Reject an order that is outside the store's service area. Kept in one place
 * so a city/state rule and an optional radius behave identically for all order
 * types (restaurant, vendor, future scheduled orders).
 */
function assertServiceArea(store, address) {
  if (!store || !address) return;

  const storeCity = store.address?.city;
  const storeState = store.address?.state;

  if (SERVICE_AREA_RULE.sameCity && storeCity && normalize(storeCity) !== normalize(address.city)) {
    const error = deliveryAddressError(
      `This restaurant delivers in ${storeCity} only. Choose a ${storeCity} delivery address.`,
      'OUT_OF_SERVICE_AREA'
    );
    throw error;
  }

  if (SERVICE_AREA_RULE.sameState && !storeCity && storeState
    && normalize(storeState) !== normalize(address.state)) {
    throw deliveryAddressError(
      `This store delivers in ${storeState} only. Choose a ${storeState} delivery address.`,
      'OUT_OF_SERVICE_AREA'
    );
  }

  if (SERVICE_AREA_RULE.radiusKm
    && Number.isFinite(store.locationCoords?.lat) && Number.isFinite(store.locationCoords?.lng)
    && Number.isFinite(address.lat) && Number.isFinite(address.lng)) {
    const distance = haversineKm(store.locationCoords, address);
    if (distance > SERVICE_AREA_RULE.radiusKm) {
      throw deliveryAddressError(
        `This store delivers within ${SERVICE_AREA_RULE.radiusKm}km only.`,
        'OUT_OF_SERVICE_AREA'
      );
    }
  }
}

module.exports = {
  NIGERIAN_STATES,
  SERVICE_AREA_RULE,
  validateDeliveryAddress,
  formatAddress,
  assertServiceArea,
  isValidPhone,
};
