# Google product visibility recovery plan

Implementation entry point: [commerce reference](../../docs/commerce-reference.md).
Reuse its settled shipping/return facts; investigate only changed or unresolved
facts. The dated planning status below is historical; current implementation
acceptance is in `recovery-gates.md`.

Status: investigation and owner review, September 11, 2026. No production changes authorized for this planning turn. Use Ponytail, Wayfinder and Unlazy. The owner explicitly includes every issue found, including non-critical warnings. This plan covers Dude McGee and Bass Binge Baits; Dirt Cat indexing emails are classified and retained as related follow-up. This is separate from the one-shirt merchandise pilot.

## Destination and completion standard

Every available, independently purchasable product and variant must have complete, accurate catalog data, crawlable and usable product pages, correct Google submission, and evidenced eligibility for each applicable free Google surface and target market. Compare capabilities across both brands with eligibility-based exceptions, then compare performance only where actual data supports it. Equal technical treatment is required; equal ranking or impressions cannot be promised. A feed import, a valid rich result, an indexing request and actual customer visibility are distinct outcomes.

Do not call this fixed while a critical issue, actionable warning, missing product, unresolved review requirement, or unverified account state remains. If an external decision or real customer data is required, leave that issue explicitly open with owner, next action and next-check date. Never fabricate reviews, identifiers, shipping rates or business policies to clear a warning.

## Verified starting problems

See [current evidence](evidence.md) and the [Wayfinder map](map.md). September 11 live account evidence supersedes older under-review/clean-diagnostics records:

- Dude Merchant account 5849042058: 64 total offers, 64 not approved and64notshowing. Domain mismatch affects all64; missing shipping, color and gender each affect the nine Checkout Girl Tee variants. Online store is now dude-mcgee-merch.myshopify.com, Verified/Claimed, while feed URLs use www.dudemcgee.com.
- Dude Search Console: 55 valid merchant items, 0 invalid, but all 55 have missing shippingDetails and hasMerchantReturnPolicy. Product snippets: 10 valid, 0 invalid, all 10 missing aggregateRating and review; validation not started. These are crawled/report counts, not the current live catalog count.
- Bass Merchant account 5849042055: 1,013 total and 1,013 not showing; Approved0, Limited0, Not approved8 and Under review rounded to1K. Do not invent an exact under-review count. Unfiltered issue report has8 affected offers: shipping missing on6 Buffet Craw variants; image not processed on2 offers; unavailable product page on1 hoodie variant (overlap). Three additional Google-discovered products are scheduled for automatic addition October11, while Data Sources reports one found product; identities and the count discrepancy remain open. Bass's public return policy and verified Google return policy are now complete, superseding the older draft, but no account-level shipping policy is configured.
- Older successful work already added live catalog feeds, server product pages, ProductGroup/Offer markup, variant deep links, image discovery and policies. Reuse and repair those paths; do not rebuild the storefront or create duplicate accounts/feeds.
- Public baseline: Dude11products/64variants and Bass44public products/1013variants. Bass has45internal products/1017variants when the hidden four-variant rattle add-on is included; give those variants explicit hidden/non-standalone inventory rows. Dude query ceilings are50products/50variants/10images against current maxima11/9/6 and require boundary checks. Dude's sitemap has47image entries; Bass has zero image-sitemap entries despite467public product images.

## Implementation sequence

### 1. Freeze a complete baseline and reconcile identities

Read all current Merchant data sources, products, diagnostics, account issues and discovery suggestions for both accounts with prioritized filters OFF. Record status by country and marketing method, not just aggregate counts. Reconcile Shopify Admin active/channel publication and purchasable variants against public catalog, page inventory, sitemap, submitted feed and Merchant processed offers. Page through every source; public feed-to-public-catalog equality alone is circular evidence if both use a truncated adapter.

Identify each of the three Bass suggested products by canonical URL, SKU/GTIN where genuine, Shopify product/variant ID and feed source; distinguish missing offers from alternate URLs or duplicate representations. Data Sources says one found product while the email/banner says three, and the read-only download was browser-blocked; preserve that discrepancy until identities are obtained. Resolve now through the authoritative source where possible rather than waiting for October11. Preserve the four hidden non-standalone add-on variants only with explicit inventory rows/reasons. Sold-out variants remain truthful and are not counted as available inventory.

Deliverable: dated per-product/per-variant matrix with expected and observed identity, publication, stock, feed, Google status, issues and evidence. All available inventory must have a row. No guessed fixed product totals.

### 2. Repair domain ownership and prevent recurrence

Preserve the existing brand URLs and Merchant IDs. Inspect current Shopify Google & YouTube settings, connected services, primary store domain and available change history to establish what is rewriting the Merchant website. September 8 records show app onboarding changed it twice; the latest actor is not yet proven. Restore the correct brand claim only after choosing the supported configuration that will keep it stable. Preserve checkout functionality, analytics and existing channel eligibility.

Prefer one authoritative feed using the current headless domain. Evaluate the smallest supported app configuration change before any disconnect/uninstall or domain/DNS change. Re-read the website claim after the next app sync and scheduled feed cycle; one successful immediate readback is insufficient. Resubmit affected offers and inspect processed domain diagnostics, not only XML import success.

### 3. Complete shipping, returns and apparel facts across all products

Correct the nine Dude Checkout Girl Tee variants and six Bass Buffet Craw variants using verified Shopify/Printful product profiles. Eliminate the silent gap in hardcoded handle mappings for newly added products. Reuse the smallest shared policy/profile data for feed and page markup; unknown mappings must create a visible failure/alert, never silently omit shipping or invent a default rate.

Add accurate `shippingDetails` and `hasMerchantReturnPolicy` to every applicable product/offer in page JSON-LD, using truthful offer overrides where required so the owner-requested warnings clear. Cover costs, currency, destinations, handling/transit/business days, return category/window/fees and policy URLs. Match public policy, feed, Google settings and actual checkout, including quantity rules, free thresholds, mixed fulfillment, geographic exclusions and sold-out variants. Avoid treating defect-only replacement rights as general returns.

Verify Checkout Girl's actual color and intended gender in the authoritative product/Printful data and publish those attributes consistently. Audit all other recommended/required applicable attributes: age group, size, material, pattern, brand, legitimate identifiers, variant grouping, image quality and additional images. Do not derive gender from artwork or invent identifiers.

Bass return condition/exchange preferences are now resolved and published: unused/refund-only, no exchanges, customer-paid return shipping,10%restocking, seven days. Google return policy9304698322 is Verified for all1013offers. Preserve those terms. No new policy terms are invented; account-level shipping remains unconfigured and per-offer shipping must be reconciled.

### 4. Resolve every remaining technical and image issue

Investigate Google-reported Bass Hoodie Navy/M URL and the two unprocessed image URLs using the exact processed links. Check desktop/mobile fetch, redirects, status, robots, CDN/firewall behavior, content type and image dimensions. A successful current HTTP request does not prove Google's earlier report was false; compare last crawl/error date and request supported reprocessing after the cause is corrected.

Sweep every canonical product and variant landing URL: canonical choice, no unintended noindex/robots restriction, server-visible name/price/stock/images, matching JSON-LD, crawlable internal links and sitemap membership, exact selected variant, price/image/stock parity and correct checkout merchandise ID. Exercise browser flows for each distinct template and edge case; run data checks across every variant. Cover inventory/price/image changes, new products, retired products, pagination beyond current limits and upstream/cache failure.

### 5. Deal with genuine reviews, ratings and store quality

Search Shopify/app/review records for existing legitimate product reviews; distinguish product reviews from store/seller ratings. If data exists, expose it visibly with accurate counts and valid Product review/aggregateRating markup. If no data exists, implement the smallest appropriate collection/display path and retain an explicit awaiting-first-genuine-review issue; the warning remains open until genuine data exists and valid visible markup is processed. Customer outreach is not sent without the owner's explicit authorization. Do not use testimonials from another product or manufactured placeholder stars.

Address the store-ratings emails as their own feature: inspect existing collection program and eligible integrations before proposing new access, cost or subscriptions. Every warning gets a disposition and follow-up; optional does not mean omitted from scope. Warnings that depend on genuine future reviews cannot honestly be marked cleared today.

### 6. Verify Google processing and real discovery

Use Rich Results Test for every distinct schema/template and an exhaustive local/live schema sweep. Start Search Console validation for corrected issue types and submit canonical sitemaps/crawl requests where appropriate. Inspect all canonical product URLs in available Google reports/URL Inspection within quotas; record uninspected/pending URLs explicitly. Preserve intentional redirects and alternate canonical exclusions, and verify their destination is indexable.

After Merchant processing, re-export/inspect every offer: zero unresolved Not approved or Limited issues for intended eligible inventory, no unintended hidden/excluded destinations, accurate shipping/returns and no duplicate competing offer identities. Pending review is pending, not completed. Check account-level policies separately from item issues.

Establish the strongest product from Search Console and Merchant performance by explicit date range, market and surface. Current evidence is too sparse to name one: Dude has no individual product row, and Bass has only two one-impression product rows. Build a cross-brand capability matrix for Search product results, merchant/free listings, Images and applicable Shopping surfaces, with eligibility-based exceptions. Check YouTube eligibility separately; Merchant eligibility does not enable an ineligible YouTube channel. Record actual impressions/clicks independently of readiness and approval. Zero impressions trigger diagnosis; do not assert a ranking guarantee.

### 7. Add the minimum recurring verification that catches these failures

Extend existing catalog/feed and SEO checks rather than introduce a new platform. Checks must detect changed Merchant website claim, Dude's50/50/10 query boundaries, unclassified new products, hidden Bass add-on disposition, shipping/attribute gaps, feed expiry/fetch failures, unexpected item-count differences, duplicate discovery sources, missing pages/images, Bass's0-versus467 image-sitemap gap and newly appearing warnings. Use native Google notifications plus a durable per-issue tracker and supported authenticated status checks. Any new credentials follow the owner's Keychain save-and-verify rule before issuance/use.

Proposed cadence for owner review: inspect after deployment and next scheduled feed/app cycle; check daily during recovery until Google processes fixes; thereafter a weekly full diagnostic review plus per-catalog-change checks. Set exact dates from actual validation/review timestamps. Image processing gets a check within the Google-stated three-day window; unresolved review gets a dated escalation. This planning turn does not silently create a scheduled automation.

### 8. Independent review and honest closure

Use read-only independent review after implementation, with one repository writer at a time. Reviewer must try to refute catalog completeness, data truth, domain stability, warning clearance and Google acceptance. Parent reruns meaningful checks and verifies the actual account state. Keep documentation aligned with the deployed commit and dated Google evidence. Do not close the work merely because code is deployed, feeds parse, or a filtered screen is empty.

## Implementation acceptance gates

- Complete independently reconciled inventory, with every available product/variant and the Bass three-versus-one discovery discrepancy resolved and every actual suggestion accounted for; no unexplained omission or duplicate.
- Correct brand domain stays Verified/Claimed across app/feed synchronization; every offer URL uses that domain.
- All applicable shipping/returns/apparel/identifier/image fields agree across catalog, page, schema, feed, Google and checkout; new-product regression check fails on missing mappings.
- All product pages/variants pass full data checks; each distinct browser journey and edge case passes; Google-reported broken page/images reprocessed or kept visibly pending.
- Every critical and non-critical issue has a tracked result. Actionable defects cleared; genuine-data dependencies remain open and named, never fabricated or silently waived.
- Search Console validates corrected issue types after recrawl; exact pending URLs and review states remain open until observed.
- Merchant per-offer/per-market approval and destination eligibility verified after processing; no blanket completion based on source import success.
- Actual visibility baseline and best-product comparison recorded, with performance outcomes separated from technical eligibility.
- Regression checks and a concrete recurrence workflow tested; documentation audit records each file's disposition and leaves historical evidence intact.

## New task handoff

After the owner reviews this plan, create a separate implementation task in the saved Dude McGee Website project; preserve current untracked evidence in the handoff (it will not automatically exist in a fresh Git worktree). Include Bass Binge Baits as the related repository, current map/evidence, all owner instructions and the requirement to read Ponytail, Wayfinder, Unlazy. Do not start by recreating completed accounts, feeds or page infrastructure. Any broad integration disconnection, binding policy decision or newly required access must be concrete and reviewable before the required approval step.

## Implementation session — September 11
Owner-authorized fresh implementation task. Original nonsecret handoff copied before edits. Root is the sole writer initially; research/review workers are read-only. Five research tickets claimed. Recovery acceptance is tracked separately in recovery-gates.md; planning completion is not recovery completion.

Dispatch: domain_research and schema_research requested native Sol/medium; inventory_audit requested Terra/medium. All read-only, launches accepted, observed runtime model/effort unknown. Parent sole writer and browser operator.
Checker inspection: fileArgs erroneously excludes index0 when --timeout absent (tIdx=-1). Using --status before explicit path correctly reads nested ledger; status reports5planning gates. Existing checked CHECK lines are not rerun by checker; rerun handoff command separately.

Catalog pagination leaf contracted to domain_research worker (Sol/medium reused for interacting pagination constraints); owns only lib/shopify-catalog.js, one focused new test, catalog-gates.md. Parent relinquishes repository writes until leaf returns. No deployment/account ownership.

PaginationC3 parent rerun passed after independent null-image-ID correction. Next sole writer domain_research owns Dude policy/feed/route/sitemap focused files and tests; parent retains browser/read-only and review.
