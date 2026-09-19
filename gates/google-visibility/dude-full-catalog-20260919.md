# Dude McGee full-catalog Shopping audit — September 19, 2026

## Findings

- Public catalog and XML feed reconcile exactly: 11 designs, 64 variants; no missing, extra or duplicate IDs. All canonical product pages return 200 and appear in the sitemap. All variants have schema identities. Feed prices/availability match the catalog. Policy markup is present.
- Merchant account 5849042058, source 10723541341: last scheduled fetch September 19 at 00:00 CDT, 64 updated, 0 new, all attribute names recognized, no file-level issues.
- All 64 individual Merchant table rows are Approved and VISIBLE under Free listings. IDs reconcile to the public catalog; this is distinct from actual consumer query placement.
- **Individual offer details revealed warnings despite the empty aggregate Needs attention page.** Coozie 53792684605747 has invalid-format warnings for shipping_handling_business_days and shipping_transit_business_days. Both say limited visibility in US Free listings. Handling-days issue detail reports 64 products / 100% affected.
- The current feed sends flat M-F text for both fields. The correction makes each a country/business_days compound XML value, preserving US and Monday–Friday. Rates, timing, product identities, price, images and all other feed output remain identical.

## Actual Shopping cards

Signed-in Chrome, 1186×907, personalized Arkansas results. These observations are not guarantees for other users or every size variant.

| Design | Shopping observation |
| --- | --- |
| Checkout Girl Tee | New: XL $30 on `dude mcgee`; 3XL $34 on `dude mcgee tees` |
| Digital Fauna Tee — Neon Leaf chest logo — White | New: XS $30 on both queries above |
| Digital Fauna Signal Tee — DM Logo — White | Not observed in broad/tee/Signal Tee checks |
| Digital Fauna Signal Tee — DM Logo — Black | Not observed in broad/tee/Signal Tee checks |
| Neon Leaf Hoodie — Black | 3XL $49 on `dude mcgee`; also morning evidence |
| Neon Leaf Hoodie — White | 3XL $49 on `dude mcgee`; also morning evidence |
| HeartWave Hoodie — White | M $55 on `dude mcgee`; also morning evidence |
| Digital Fauna Hoodie — DM Logo — Black | Morning daily-review evidence, M $45 |
| Neon Leaf Trucker Hat — White | New: $20 on `dude mcgee hats` |
| Digital Fauna Foam Trucker Hat — Black | New: $20 on `dude mcgee hats` |
| Digital Fauna Coozie | Not observed on `dude mcgee coozie` |

Eight of eleven designs now have actual observed Shopping cards. A storefront-domain Shopping query gave no product cards and is not proof of catalog exclusion. Search Popular products was not rechecked and remains unconfirmed. All-size serving is unconfirmed.

## Implementation and validation

Isolated release checkout: `/Users/josh/.codex/worktrees/dude-shopping-business-days/Dude McGee Website`, based on origin/main 4528aa0. Only feed XML encoding, its regression check, and evidence/reference documentation change. The same focused code patch was applied to the original dirty checkout without overwriting existing edits.

Feed regression, product-route/schema/browser-behavior checks, local SEO and diff whitespace checks pass. Generated XML from the live 64-offer catalog is byte-identical to production after reversing only the two intended compound-field encodings.

First CLI deploy dpl_5sVvscf2nXpQq2iqrj2hPtrUuktL is BLOCKED before build. Vercel directs to account/commit-author configuration; CLI incorrectly displayed UNKNOWN and waited. Previous production dpl_A2kZxDuF7ryS768GCcjRFU1K2esd remains the last verified READY deployment. GitHub authenticated owner verified as 870DudeMcgee / 223700099; release will use that account’s noreply identity. No account permission changes or new secrets.

Deployment and Merchant reprocessing still pending. Do not claim the warning is fixed in Google until rechecked.

## References

- [Commerce reference](../../docs/commerce-reference.md)
- [Machine-readable public audit](dude-catalog-audit-20260919.json)
- [Morning observations](daily-review-20260919.md)
- [Google product specification](https://support.google.com/merchants/answer/7052112?hl=en)
- [Google API business-day configuration](https://docs.cloud.google.com/go/docs/reference/cloud.google.com/go/shopping/latest/merchant/products/apiv1/productspb)

Bass was not inspected or modified in this run. No duplicate Google feedback or paid campaign was created.
