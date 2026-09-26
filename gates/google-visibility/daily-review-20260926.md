# September 26 daily review and focused feed repair

Execution: solo two-mapping repair under existing R3/R6 gates; preserve owner changes.
Context accounting unavailable; bounded reads and compact evidence used. No workers.

- [x] Confirm current failure and authoritative assignments. HTTP503 twice; Vercel logs missing curtain policy; Shopify PF-FRG53 $8.29 and PF-FRG42 $4.69, all12 new variants verified.
- [x] Run existing feed/product/discovery checks plus full live-catalog render and required SEO checks.
- [x] Bounded adversarial review: check current production base, all76 identities/rates and unchanged64 mappings; no account or policy changes.
- [ ] Deploy focused repair and verify live feed/pages; request one fetch only after output corrected.

Google serving/eligibility remains separate from deployment acceptance.

Verification: existing feed, product-route, merch-discovery and SEO checks pass. Full saved public catalog renders13 pages/76 unique offer IDs; both new schema rates match Shopify. Bounded self-review: production base ef1684e preserved; diff adds only2 mappings, inventory assertion and evidence; previous11 mappings untouched. Unknown future mappings still fail closed; preventing recurrence for arbitrary future products would require a separate design decision.
