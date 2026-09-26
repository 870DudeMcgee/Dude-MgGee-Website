## September 26 feed outage and verified new products

Live catalog expanded to 13 products / 76 variants. Feed returned HTTP503;
production logs on deployment dpl_Avms2jvcetmUB3x8UC3UGuLbRd5e identify
`Missing verified product policy for jungle-city-shower-curtain`.
Merchant source10723541341 September26 midnight CDT failed with Connection failed,
although the previous64 offers remain Approved.

Authenticated Shopify shipping profiles verified September26:
- Jungle City — Shower Curtain, product10478649999667, sole variant54132072186163:
  [profile134066307379](https://admin.shopify.com/store/dude-mcgee-merch/settings/shipping/profiles/134066307379), Printful PF-FRG53, US Flat Rate **$8.29**.
- Jungle Frequency — All-Over Print Shirt, product10478648131891, all11 sizes2XS–6XL:
  [profile134066209075](https://admin.shopify.com/store/dude-mcgee-merch/settings/shipping/profiles/134066209075), Printful PF-FRG42, US Flat Rate **$4.69**.

Both assignments were observed selected in the existing profiles; no Shopify
settings changed. Shared mappings restore feed and Product structured data using
existing published Printful timing/returns. Standard single-offer rates only;
no new Express, mixed-cart, account-rate or supplemental-label claims.
Implementation verification and deployment acceptance tracked in
[September26 review](../gates/google-visibility/daily-review-20260926.md).

## Dude-only catalog audit and feed warning — September 19, 2026

The [Dude catalog audit](../gates/google-visibility/dude-catalog-audit-20260919.json)
reconciles 11 public products / 64 variants to all 64 feed IDs with no omissions,
extras or duplicates. All 11 pages return 200, appear in the sitemap, and contain
variant identities and shipping/return markup. It checks markup presence, not
Merchant parsing of every attribute. All 64 individual Merchant rows were observed
Approved and VISIBLE in the Free listings view at about 18:12 UTC.

**Approval does not mean warning-free:** coozie offer `53792684605747` has two
individual Needs attention warnings: invalid sub-attribute format for
`shipping_handling_business_days` and `shipping_transit_business_days`, each
explicitly limiting US Free listings visibility. The main Needs attention view
was empty. Every live offer uses the same flat `M-F` encoding. This is a newly
confirmed feed-format issue, not a change to verified shipping rates or timing.
The handling-days issue detail reports **64 impacted products (100%)**.
A focused correction uses nested `country=US` and `business_days=M-F` values for
both XML attributes. Deployment and Google reprocessing are pending at this point.
Google's [current product specification](https://support.google.com/merchants/answer/7052112?hl=en)
and [Merchant API business-day structure](https://docs.cloud.google.com/go/docs/reference/cloud.google.com/go/shopping/latest/merchant/products/apiv1/productspb)
support country/business_days configurations; older simple XML examples conflict
with the live parser, so acceptance must be confirmed in Merchant Center.

New actual Shopping cards: Checkout Girl, white Neon Leaf chest-logo tee, both
hats. With the four hoodie designs seen earlier today, 8/11 designs now have
observed cards. DM-logo tees (black/white) and coozie remain unconfirmed in sampled
Shopping searches. No claim that every size is separately served or that Search
Popular products is confirmed. Bass is outside this run.

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
  September 11; re-confirmed after the September 23 API re-claim. "Mismatched
  online store URL" is gone: `accounts/5849042058/issues` returned zero open
  issues on 2026-09-23. Do not repeat the claim/mismatch investigation.
- **Google processing:** closed 2026-09-23. `product_view` reports all **64
  offers ELIGIBLE** with US FREE_LISTINGS approved and **zero item-level
  issues** (the September 19 `M-F` handling-days warning is no longer reported
  for any offer, including coozie `53792684605747`).
- **Exact per-product shipping rates:** live as of 2026-09-23 via Merchant API,
  not just the $8.79/$12.49 account estimate. Supplemental API data source
  `accounts/5849042058/dataSources/10744168764` carries `shippingLabel` on all
  64 offers (tees495×36, hoodies879×24, hats469×2, coozie469×2) and is linked in
  primary `10723541341` `defaultRule.takeFromDataSources` ([self, supplemental]).
  Rate groups on both services: Standard tees495 $4.95, hats469/coozie469
  $4.69, all-others $8.79; Express tees495 $9.99, hats469/coozie469 $11.99,
  all-others $12.49. The primary feed also emits per-item `g:shipping` exact
  Standard rates, which override account settings independently. Verified via
  `shippingSettings` GET and label reads. Gotcha: `shipping_label` in the
  Merchant API v1 REST insert is a **single string, not a list**; the label
  merge additionally requires the primary's `defaultRule` link.
- **Reviews:** genuine product-review data has not been established. Never copy
  Printful blank-product reviews or fabricate ratings to clear Search warnings.

Full recovery acceptance is tracked in
[recovery-gates.md](../gates/google-visibility/recovery-gates.md). Historical
planning completion is not proof that production recovery is complete.


## Featured Drop 000 — Website ticket 20, September 11

Owner confirms Original Black Signal Tee is Shopify product
`gid://shopify/Product/10332079161651`, listing `/products/unisex-t-shirt`.
The public listing still matches the social evidence revision
`public-sha256:7be5f211b557bb8c45c2a32abddac3170393eb10cd7b29b61ddb8ff47b63d008`,
with nine available variants. The Website-only feature is live and verified on
September 11 through public HTTP and a 390×844 browser journey, preserving all
11 catalog products. Activation uses a dedicated private Blob pointer with
conditional ETag updates and a retained success receipt. This is not an approved
social package. Exact invocation, media provenance, deployment and browser evidence: [Website ticket 20 execution](../gates/merch-pilot/featured-drop.md).
Permanent destination remains `https://www.dudemcgee.com/merch.html`.
