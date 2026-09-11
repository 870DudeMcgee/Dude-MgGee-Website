# Google product visibility evidence — September 11, 2026

This is the current evidence entrypoint for the all-product recovery plan. It supersedes older account-status summaries without changing their dated historical record. No production, Merchant Center, Search Console, Shopify, publishing, or account-setting change was made during this planning work.

## Outcome vocabulary

- **Submitted:** a source or sitemap was offered to Google.
- **Recognized:** Google parsed an offer from a source. This does not establish approval.
- **Valid structured data:** Search Console or Rich Results Test could parse supported markup. This does not establish Merchant approval, indexing, or impressions.
- **Indexed:** Google selected a page for its search index. An accepted crawl request does not establish this outcome.
- **Eligible or approved:** Google reports that an offer may show for a named country and marketing method. Pending review and “not showing” are not approval.
- **Visible:** an eligible item received an impression on a named Google surface and date range. Eligibility never guarantees impressions.

## Current public inventory

Read-only public checks on September 11 returned:

- `https://www.dudemcgee.com/api/catalog`: HTTP 200, 11 products and 64 variants.
- `https://www.dudemcgee.com/api/google-products`: HTTP 200, 64 `<item>` offers.
- `https://www.dudemcgee.com/sitemap.xml`: HTTP 200, 16 URLs: five editorial pages and 11 product pages.
- The new `checkout-girl-tee` has nine variants. Its current feed offers contain size and adult age group, but omit shipping, color, and gender.

The current adapter explains those omissions. `lib/google-product-feed.js` has no shipping-rate mapping for `checkout-girl-tee`; its color inference only accepts a color at the end of a title; and its gender inference requires explicit “unisex” copy. The product description does explicitly state heather gray. The actual Shopify/Printful shipping profile and intended Google gender value still require authoritative verification before implementation.

Existing local checks passed on September 11: Google feed, product route and browser-selection VM checks, merchandise discovery, static SEO, and artist identity. The static SEO run covers five authored HTML files; live mode additionally reconciles dynamic product URLs with the catalog.

A cross-brand public audit covered 55 canonical product pages and 1,077 offers: Dude 11/64 and Bass 44/1,013. Every page returned HTTP 200 with the expected canonical and valid Product/ProductGroup JSON-LD; feed IDs matched page-schema offer IDs. Neither brand currently emits shipping, return-policy, review, or rating properties in product JSON-LD. Dude's sitemap has 47 image entries. Bass has 467 public product images but zero image-sitemap entries. Dude's catalog queries currently cap at 50 products, 50 variants, and 10 images; the live maxima are 11, 9, and 6, so no present truncation was observed, but regression coverage must detect future ceiling breaches. Bass exposes 45 internal products/1,017 variants including the hidden four-variant rattle add-on; 44/1,013 public items exactly match the native public Shopify catalog.

## Dude McGee Google evidence

Authenticated Merchant Center account **5849042058** on September 11:

- 64 total offers, 64 not approved, and 64 not showing.
- With prioritized filtering disabled, four diagnosed issue types:
  - mismatched online store URL: 64 offers, 100%;
  - missing shipping: nine offers, 14.1%;
  - missing color: nine offers;
  - missing gender: nine offers.
- The nine attribute/shipping omissions are the Checkout Girl Tee variants.
- Business information currently shows `dude-mcgee-merch.myshopify.com` as Verified/Claimed, while all 64 scheduled XML feed links use `www.dudemcgee.com`.

September 8 evidence records the Google & YouTube Shopify app changing the Merchant website to the native Shopify domain twice during onboarding, followed by the operator restoring `www.dudemcgee.com`. The September 11 drift confirms recurrence. The actor responsible for the latest change has not been proven; the app is a hypothesis, not a finding.

Authenticated Search Console evidence on September 11:

- Merchant listings: 55 valid items, zero invalid. All 55 report non-critical missing `shippingDetails` and `hasMerchantReturnPolicy` warnings.
- Product snippets: 10 valid items, zero invalid. All 10 report non-critical missing `aggregateRating` and `review` warnings; validation has not started.
- Page indexing: two indexed and seven not indexed in the displayed report. Reasons are three redirects, one alternate canonical, and three discovered-currently-not-indexed pages. The inspected discovered examples are `label.html`, `press/`, and `returns.html`, not product URLs; the small report is not evidence of complete product-page coverage.
- Web performance default chart, July 20 through September 8: nine clicks and 82 property impressions. The seven-row Pages table contains no `/products/` URL; `merch.html` has zero clicks and 46 impressions. Page rows must not be summed as property totals, and merch-page visibility does not identify a specific product.

These Search Console counts reflect Google's crawled/report inventory and lag the live 11-product/64-variant catalog. The warnings are separate from Merchant Center's current domain, shipping, color, and gender eligibility problems. Reviews and ratings must be genuine; no markup should be fabricated to clear an optional warning.

Earlier September 8 records of 55 imported offers, “All recognized,” “No issues found,” 55 under review, and zero approved remain valid observations for that time. They prove source ingestion and the then-visible diagnostic state only. They do not prove later approval, indexing, Shopping appearance, or impressions.

## Bass Binge Baits Google evidence

Authenticated Merchant Center account **5849042055** on September 11:

- 1,013 total offers and 1,013 not showing. Overview reports Approved 0, Limited 0, Not approved 8, and Under review at a rounded “1K”; do not invent an exact under-review count from arithmetic.
- No account setup or policy issue is shown.
- With prioritized filtering disabled, eight affected offers appear across two issue-report pages:
  - Missing shipping on six Buffet Craw variants: Fruit Fly `51316661354663`, Heartlander `51316661452967`, Feed Bag `51316661420199`, Smokin PB `51316661321895`, PB&J Bright `51316661289127`, and Black Hole `51316661387431`.
  - Image not processed on Heartlander `51316661452967` and Pee Wee Football Ry Ry Special `50250725720231`.
  - Product page unavailable on hoodie Navy / M `51225537282215`.
- The prioritized view said all issues were fixed, which is contradicted by the unfiltered report. Future checks must keep filters disabled and page through all results.

The overview shows four of five setup steps, with shipping as the remaining step. The Shipping tab has no account-level policy and offers Get started, while 1,007 previously submitted offers had valid per-offer shipping. This does not establish that all current items lack shipping; the six diagnosed Buffet Craw offers are the exact current omission set.

The live Bass return page is now published with unused/refund-only eligibility, no exchanges, customer-paid return shipping, a 10% restocking fee, and a seven-day window. It states bait handling of one to three business days/transit three to five, and Printful handling two to five/transit one to eight. Merchant return policy **9304698322** is Verified for the United States and applies to all 1,013 offers. This supersedes the earlier pending condition/exchange and unpublished-draft record.

The public Bass catalog currently has 44 products/1,013 variants. The six missing-shipping offers belong to the new Buffet Craw product, which is absent from the existing handle-based shipping mapping. The reported Navy/M hoodie URL currently returns HTTP 200 with $38 and InStock schema. Both reported image URLs currently return HTTP 200 valid JPEGs. Those public successes suggest a stale or transient Google result but do not prove the Google issues cleared; reprocessing and a later account read are required.

Bass Business information shows `www.bassbingebaits.com` Verified/Claimed; the current domain mismatch is Dude-only. Bass Search Console Web performance for July21–September8 reports13property clicks and30property impressions. Its five Pages rows are homepage7clicks/28impressions, shop6/24, about0/5, tote-bag0/1, and heavyweight hoodie0/1. Page rows do not sum to property totals. Only two individual product references appear, each with one impression and no clicks, so this evidence is too sparse to name a strong product winner.

Email `1a08ea25909db230` says three Bass products found on the website are missing from Merchant Center and are scheduled for automatic addition on October 11. The message does not identify approval, impressions, or the complete catalog. The three products must be identified and reconciled with source `10723541584` before automatic addition can create unexplained or duplicate representations.

Merchant Data Sources shows one provided XML source, `10723541584`, with 1,013 items processed at the September 11 midnight cycle, plus “Found by Google” reporting one additional product. That conflicts with the three-product email/banner count and must be preserved as an unresolved discrepancy. A read-only Download discovered products action was blocked by the browser client at `storage.googleapis.com`; no product was added and no identity should be guessed.

## Email search evidence

The connected mailbox was searched all-time with `in:anywhere` queries for both brands, Merchant/Shopping/product issues, indexing, ratings, and review warnings. Eleven relevant Google messages were read and no result pagination remained: nine warning/status messages plus two ratings/review prompts.

| Message | Classification |
|---|---|
| [1a08ea25909db230](https://mail.google.com/mail/#all/1a08ea25909db230) | Bass: three discovered products missing; automatic addition scheduled October11 |
| [1a08594030d3930c](https://mail.google.com/mail/#all/1a08594030d3930c) | Dude: merchant-listing shipping/return warnings |
| [1a08593f2624e35d](https://mail.google.com/mail/#all/1a08593f2624e35d) | Dude: product-snippet rating/review warnings |
| [1a07bb69fef00c5b](https://mail.google.com/mail/#all/1a07bb69fef00c5b) | Bass: September7 Shopping-tab notice for two detected products |
| [1a0787eb1d290d2d](https://mail.google.com/mail/#all/1a0787eb1d290d2d) | Dude: alternate-canonical indexing notice, September6 |
| [19fa65a9086f59de](https://mail.google.com/mail/#all/19fa65a9086f59de) | Bass: redirect/noindex notice, July27 |
| [19fa614963b586cf](https://mail.google.com/mail/#all/19fa614963b586cf) | Dude: redirect notice, July27 |
| [19fdea573dd502c3](https://mail.google.com/mail/#all/19fdea573dd502c3) | Dirt Cat: alternate-canonical notice, August7 |
| [19fa611141e2d216](https://mail.google.com/mail/#all/19fa611141e2d216) | Dirt Cat: redirect notice, July27 |
| [1a084ee473cde956](https://mail.google.com/mail/#all/1a084ee473cde956) | Dude: store-ratings prompt, September8 PDT |
| [1a0835729ba76fcb](https://mail.google.com/mail/#all/1a0835729ba76fcb) | Bass: store-ratings prompt, September8 |

Older indexing messages remain historical follow-up. Email prompts and Search Console warnings are not evidence that affected pages are currently unindexed or products disapproved.

## YouTube boundary

YouTube Studio was inspected September 8, with eligibility metrics through September 3: 10 subscribers, three qualifying uploads, 135 watch hours, 43 Shorts views, disabled YPP application, and no store-connect control. At that check Dude McGee was not eligible for own-product YouTube Shopping because it was not in YPP. An Official Artist Channel can satisfy the Shopping subscriber branch but does not replace the separate YPP requirement. Current Studio status was not rechecked on September 11.

## Deployment and pilot boundary

Repository and public evidence now show the merchandise gallery, measurement, discovery, and native-cart-permalink changes from commit `5c1eea9` in production: the public measurement, product-page, and merch JavaScript files were byte-identical to local files on September 11. This supersedes pilot documents that still say the website patch is not deployed.

Deployment does not establish that the campaign launched, that a public placement was posted, that GA history-pageview settings changed, that live events were received without duplication, that a purchase occurred, or that order attribution works. Those outcomes remain separate.

## Dispatch record

Documentation audit/update was dispatched to a native Sol worker at medium effort with sole documentation ownership. Launch was accepted; observed runtime model and effort are unknown. The parent retained read-only browser/account inspection and final review.

## Parent verification and official references

Parent independently re-fetched both catalogs/feeds: Dude 11 products, 64 offers, 9 missing shipping blocks; Bass 45 internal products, 1,013 public feed offers, 6 missing shipping blocks. A second complete sweep of 11 Dude and 44 Bass canonical product pages confirmed HTTP 200, matching canonical, parseable JSON-LD, and no shippingDetails, hasMerchantReturnPolicy, review or aggregateRating on any page. Three public pilot JavaScript files matched local bytes. These checks verify public technical state, not Google approval.

Native read-only research and adversarial plan review: google_requirements, requested Sol medium; live_catalog_audit, requested Sol medium; documentation_audit, requested Sol medium with sole documentation writer ownership. All launches accepted; runtime model/effort observations unavailable. Parent corrected stale policy assumptions, review-data closure, query-boundary tests, sparse visibility baseline, and the distinction between the September 8 Studio inspection and September 3 metrics.

Official sources checked September 11:

- [Google merchant listing markup](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing): required and recommended fields, global policies/offer overrides, validation and recrawl.
- [Google automatic product discovery](https://support.google.com/merchants/answer/12158480?hl=en): discovered products and uploaded-source handling; actual identities still require account reconciliation.
- [Google review markup guidelines](https://developers.google.com/search/docs/appearance/structured-data/review-snippet): genuine visible review data and accurate aggregates.
- [Merchant product status](https://support.google.com/merchants/answer/12488713?hl=en): approval, limitation and review are separate from impressions.
