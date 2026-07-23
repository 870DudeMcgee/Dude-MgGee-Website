#!/usr/bin/env node

'use strict';

const { loadFreshCatalog } = require('../lib/shopify-catalog.js');
const { getConfig, hasPrivateCatalogAccess } = require('../lib/shopify-storefront.js');

async function run() {
  const config = getConfig();
  const catalog = await loadFreshCatalog({ headers: {} });

  console.log(`Connected to ${config.domain} with Storefront API ${config.apiVersion}.`);
  console.log(`Authentication: ${hasPrivateCatalogAccess() ? 'private/public token' : 'tokenless'}.`);
  console.log(`Published products: ${catalog.products.length}.`);

  if (!catalog.products.length) {
    console.error('No published Shopify products are visible to the storefront.');
    process.exitCode = 1;
    return;
  }

  const unavailableProducts = catalog.products.filter((product) => !product.availableForSale);
  if (unavailableProducts.length) {
    console.log(`Unavailable products: ${unavailableProducts.map((product) => product.title).join(', ')}.`);
  }
}

run().catch((error) => {
  const shopifyMessage = error.details && error.details.errors
    ? error.details.errors.map((item) => item.message).join(' ')
    : '';
  console.error(`Shopify integration validation failed: ${shopifyMessage || error.message}`);
  process.exit(1);
});
