# PROGRESS — Paystack payment correctness (part 1)

## Done
- Owner decision: customers pay Paystack's fee; we send the plain order total (no gross-up, no bearer).
- Fee helper: 1.5% + ₦100, waived below ₦2,500, capped at ₦2,000 (`backend/src/services/paystackFees.js`).
- Quote returns estimated processing fee + estimated total.
- Order stores requested amount, charged amount, fees and fee-mismatch flag.
- Verify/webhook compare the requested amount and review successful-but-unconfirmable payments.

## In progress
- Step 0: commit the uncommitted fee-correction changes.
- Step 2: tighten the confirmation rules (status, stored reference, requested amount equals order total, NGN, charged ≥ requested; review + owner email otherwise).
- Step 3: cart/Pay button wording ("Total to pay (estimated)", fee note, naira only).

## Next
- Step 1: real Paystack TEST checkout evidence (raw initialize request/response, checkout amount, verify fields, webhook payload).
- Step 4: mocked Paystack tests (confirm, duplicate webhook, wrong reference, wrong requested amount, underpayment, overpayment within fee, review + owner email) and displayed-estimate cases.
- Step 5: test:local + test:boot, merge, deploy, `/version.json`, `/health`, one real production "Success" payment, cleanup.

## Open
- Real payment evidence not captured yet.
- Real smoke/e2e intentionally not run in this part.
