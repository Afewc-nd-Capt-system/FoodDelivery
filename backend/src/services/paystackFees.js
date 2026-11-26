'use strict';

// Paystack Nigeria local-card pricing at launch: 1.5% + ₦100, capped at ₦2,000.
// The account preference can add this on top of the requested amount, so we
// compute the gross charge ourselves, persist it, and verify against it.
const RATE = 0.015;
const FLAT_KOBO = 10000;
const CAP_KOBO = 200000;

function expectedChargeKobo(baseNaira) {
  const baseKobo = Math.max(0, Math.round(Number(baseNaira || 0) * 100));
  if (!baseKobo) return 0;
  const gross = Math.ceil((baseKobo + FLAT_KOBO) / (1 - RATE));
  return Math.min(gross, baseKobo + CAP_KOBO);
}

function processingFeeNaira(baseNaira) {
  const baseKobo = Math.max(0, Math.round(Number(baseNaira || 0) * 100));
  return Math.max(0, Math.round((expectedChargeKobo(baseNaira) - baseKobo))) / 100;
}

function nairaFromKobo(kobo) {
  return Math.round(Number(kobo || 0)) / 100;
}

module.exports = { expectedChargeKobo, processingFeeNaira, nairaFromKobo };
