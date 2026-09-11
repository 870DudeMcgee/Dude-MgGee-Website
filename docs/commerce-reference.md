# Commerce reference — read before repeating an investigation

Maintained: 2026-09-11. This is the entry point for settled shipping/return facts
and the remaining unknowns for Dude McGee and Bass Binge Baits. Historical
evidence stays in [the recovery evidence](../gates/google-visibility/evidence.md)
and [the session log](../gates/google-visibility/session-evidence.md).

## How to use this record

1. Reuse the facts below and the linked product mappings.
2. For a warning, compare the affected offer with its mapping and deployed
   feed/schema. Do not start by researching the whole return policy again.
3. Reverify only an affected fact when the owner changes terms, Shopify changes
   a profile/assignment, a new product lacks a mapping, or live evidence conflicts.
4. Record changes here with the date, source, and exact affected product/profile.
   Keep pending Google processing separate from whether a business fact is known.

## Dude McGee — established facts

| Fact | Saved value and evidence |
| --- | --- |
| Public storefront | `https://www.dudemcgee.com`; Shopify `dude-mcgee-merch.myshopify.com` supplies catalog/checkout; Printful fulfills merchandise. |
| Merchant account / existing feed | `5849042058` / `10723541341`; US, English, File(URL). Observed 2026-09-11: 11 products, 64 offers. Preserve this source. |
| Returns | Made to order; no returns/exchanges for wrong size/color, buyer's remorse, or change of mind, except applicable law. [Published policy source](../returns.html). |
| Defect support | Contact within 30 days of delivery for damaged, defective, misprinted, or incorrect items. This is **not** a general 30-day return window. |
| Google return policy | `9304336904`, Standard for United States, **Verified**, applies to 64 offers; observed 2026-09-11. UI summary displays N/A window and Free; do not reinterpret that as general free returns. |
| Schema return category | `MerchantReturnNotPermitted`, US, with the published returns URL. Do not invent a finite general return window. |
| Printful timing | 2–5 business days handling, 1–8 business days transit; published returns page. Shipping depends on products, quantity, destination, method; items may ship separately. |
| Existing standard US rates | Tees $4.95, mapped hoodies $8.79, mapped hats/coozie $4.69. Exact handle assignments now in [shared policies](../lib/product-policies.js); historical reviewed mappings preserved. Do not infer assignments from a product name. |
| Checkout Girl shipping | Shopify product `10448707715379`; all nine XS–5XL variants assigned to profile `133064753459`, Printful T-shirts `PF-FRG1001`. US Flat Rate **$4.95**, Express **$9.99**. Authenticated Shopify observation 2026-09-11. |
| Checkout Girl apparel | Heather gray explicitly in Shopify description; unisex verified for all nine variants in Printful, Bella + Canvas 3001. Printful store `18505090`, synced product `470134813`; observed 2026-09-11. Brand remains Dude McGee Merch, not the blank manufacturer. |

The new shared mapping is consumed by feed and product schema, with tests for
missing future-product mappings. At the time of this record it is **local,
independently reviewed, not deployed**. Do not confuse this implementation state with
the already verified business facts above.

## Bass Binge Baits — established facts

Source repository: `/Users/josh/Desktop/Bass Binge Baits`. Its existing dirty
files belong to the owner; do not replace them to copy this reference.

| Fact | Saved value and evidence |
| --- | --- |
| Public storefront | `https://www.bassbingebaits.com`. |
| Merchant account / existing feed | `5849042055` / `10723541584`; US, English, File(URL). Observed 2026-09-11: 1,013 offers. |
| Catalog scope | 44 public products / 1,013 variants; 45 internal / 1,017 including the hidden four-variant rattle add-on. Historical full audit in recovery evidence; distinguish internal from independently purchasable public items. |
| Returns | **Seven days, unused, refund only, no exchanges, customer-paid return shipping, 10% restocking fee.** Published live and recorded in the September 11 recovery evidence. These terms are settled. |
| Google return policy | `9304698322`, US, **Verified** for all 1,013 offers in September 11 handoff evidence. No need to recreate it. |
| Bait timing | 1–3 business days handling; 3–5 business days transit. Published policy, recorded September 11. |
| Printful timing | 2–5 business days handling; 1–8 business days transit. Same evidence. |
| Existing shipping implementation | Exact handle assignments, regional scope, $8.99 bait rate and $50 free-shipping threshold are recorded in Bass `lib/google-product-feed.js`. Its Printful profile review is dated 2026-09-07. Reuse the map, checking the affected assignment when needed. |
| Important existing exception | `heavyweight-hooded-sweatshirt-independent-trading-co-ind4000-2` is assigned to the T-shirt profile: **$4.95**, not the generic hoodie rate. Documented September 7 in that map. |
| Schema caution | Customer-paid return shipping is not a known fixed return charge. Do not claim a full refund when a 10% restocking fee applies. Optional numeric `restockingFee` encoding remains unresolved; retain visible 10% terms rather than guess the numeric convention. |

## Only these relevant questions are still open

- **Bass Buffet Craw:** six offers lack shipping. Its actual Shopify profile
  assignment is not yet verified. Bass Shopify is waiting for owner passkey
  verification; this is an access/mapping gap, not an unknown general policy.
- **Quantity/mixed fulfillment:** existing single-offer standard rates do not
  establish every mixed-cart or multi-quantity checkout calculation.
- **Dude domain stability:** restored www.dudemcgee.com Verified/Claimed on
  September 11. Product and shipping sync were already Off. Persistence after
  subsequent synchronization is unproven; do not repeat those settings as a fix.
- **Google processing:** after domain restoration, all 64 Dude offer rows were
  checked: 49 Approved, 6 Under review, 9 Checkout Girl Not approved. Unfiltered
  diagnostics listed shipping/color/gender on those nine and no domain mismatch.
  Shipping/schema code deployment and subsequent Google processing remain open.
- **Reviews:** genuine product-review data has not been established. Never copy
  Printful blank-product reviews or fabricate ratings to clear Search warnings.

Full recovery acceptance is tracked in
[recovery-gates.md](../gates/google-visibility/recovery-gates.md). Historical
planning completion is not proof that production recovery is complete.
