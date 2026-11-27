# PROGRESS — Paystack payment correctness (part 1b)

## Done
- Baseline on `work/paystack-completion`: `test:local` **37/37**, `test:boot` **5/5**.
- Owner decision enforced: initialize sends the plain order total, no bearer, no gross-up.
- Confirmation rules shared by verify + webhook: success, stored reference equality, stored requested amount equals `order.totalAmount*100`, NGN, charged >= requested; otherwise `payment_review` + owner-review email. Idempotent.
- Fee estimate (1.5% + ₦100, waived below ₦2,500, capped ₦2,000) in quote/cart/estimated total.
- Sanitized payment audit entries on orders (source/event/status/reference/amount/requested_amount/currency/fees/channel/gateway_response/paid_at/receivedAt) for verify and webhook.
- Admin-only `GET /api/v2/admin/orders/:id/payment-audit` mounted.

## In progress
- Commit this step + PROGRESS and push.
- Mocked-Paystack local tests (all listed cases, initialize body no bearer/no gross-up, estimate combinations).
- `test:paystack-real` Playwright script (write only, do not run).

## Next
- Add the mocked tests, real-checkout script, run local/boot again, commit/push each.

## Open
- No mocked Paystack cases wired yet; no redaction test yet.
- Real-checkout script not written.
- No merge/deploy (explicitly out of scope for 1b).
