# Dude-MgGee-Website
Website for artist Dude McGee

## Merch storefront

`merch.html` keeps product browsing and cart review on the Dude McGee site,
then sends the customer to Shopify for secure checkout. Printful fulfills the
products published from Printful to the `Dude McGee Merch` Shopify store.

Shopify is the live source for product titles, descriptions, prices, images,
variant availability, and checkout merchandise IDs:

- `api/catalog.js` reads and caches the published Shopify catalog.
- `api/shopify-cart.js` creates a Shopify Storefront Cart and returns its
  checkout URL.
- `merch.js` renders the catalog and manages the browser-side cart.

Public products and basic cart creation use Shopify's tokenless Storefront API,
matching the Bass Binge Baits integration. A private Headless storefront token
is optional and must stay server-side:

```bash
SHOPIFY_STORE_DOMAIN=dude-mcgee-merch.myshopify.com
SHOPIFY_STOREFRONT_API_VERSION=2026-07
SHOPIFY_STOREFRONT_PRIVATE_TOKEN=
```

Products must be active and published to the relevant Shopify sales channel.
The Shopify Online Store must also be unlocked before the tokenless storefront
can read the catalog.

Validate the live connection with:

```bash
node scripts/validate-shopify-integration.js
```
