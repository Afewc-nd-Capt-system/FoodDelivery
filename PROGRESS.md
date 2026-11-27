# PROGRESS — Paystack payment correctness (part 1)

## Done
- Owner decision: customers pay Paystack's fee; initialize sends the plain order total (no bearer, no gross-up).
- Fee estimate helper: 1.5% + ₦100, waived below ₦2,500, capped at ₦2,000.
- Quote returns estimated processing fee + estimated total.
- Order stores paystack reference at initialize, requested amount, charged amount, fees, fee-mismatch flag, review-notified flag.
- Confirmation rules (verify + webhook share `markOrderPaid`): Paystack success, stored reference equality, stored requested amount equals `order.totalAmount*100`, NGN, charged >= requested. Anything else after a success becomes `payment_review`, stores reference/amounts and sends the owner-review email through the mail service (EmailLog).
- Idempotent verify/webhook: paid orders short-circuit; a reviewed order with the same reference is not re-emailed.
- Cart labels: "Payment processing fee (estimated)", "Total to pay (estimated)", fee note, Pay button includes the estimated total.

## In progress
- Step 1 real Paystack TEST checkout evidence (raw initialize request/response, checkout amount, verify fields, webhook payload).
- Step 4 mocked Paystack tests and displayed-estimate cases.

## Next
- Step 5: `test:local` + `test:boot`, merge, deploy, `/version.json`, `/health`, one real production "Success" payment, cleanup.

## Open
- No real payment evidence or webhook payload captured.
- No new mocked-payment tests wired into test-local yet.
- No deploy/real check in this part.
