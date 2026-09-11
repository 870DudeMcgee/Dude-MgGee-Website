# What genuine data can clear every Search Console warning?
Type: research
Label: wayfinder:research
Status: open
Assignee: Codex /root (implementation research)

## Known evidence

Dude Search Console reports55 merchant items missing `shippingDetails` and `hasMerchantReturnPolicy`, plus10 product snippets missing `aggregateRating` and `review`; validation has not started. Cross-brand JSON-LD currently has no shipping, return, review or rating properties. Optional does not mean outside owner-requested scope, and reviews cannot be invented.

## Answer needed

Determine truthful offer-level shipping/return markup that agrees with public policy, feed, Merchant settings and checkout and clears the actionable warnings. Search existing systems for genuine product-review data and eligible store-rating programs. If no genuine reviews exist, leave the warning open with an authorized collection path rather than fabricate markup or testimonials.
