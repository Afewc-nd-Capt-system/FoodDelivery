'use strict';

// Owner decision: Paystack's dashboard passes transaction fees to customers.
// We send the plain order total and only show an estimate. Paystack confirms
// the exact fee at checkout.
const RATE = 0.015;
const FLAT_NAIRA = 100;
const WAIVER_BELOW_NAIRA = 2500;
const CAP_NAIRA = 2000;

function estimatedProcessingFee(baseNaira) {
  const base = Math.max(0, Number(baseNaira || 0));
  if (!Number.isFinite(base) || base < WAIVER_BELOW_NAIRA) return 0;
  return Math.min(CAP_NAIRA, Math.round((base * RATE + FLAT_NAIRA) * 100) / 100);
}

function estimatedTotal(baseNaira) {
  const base = Math.max(0, Number(baseNaira || 0));
  return Math.round((base + estimatedProcessingFee(base)) * 100) / 100;
}

module.exports = { estimatedProcessingFee, estimatedTotal, RATE, FLAT_NAIRA, WAIVER_BELOW_NAIRA, CAP_NAIRA };
