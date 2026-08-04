#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const { orderProductsForMerch } = require('../lib/shopify-catalog.js');

const products = [
  { title: 'Unisex Hoodie', handle: 'unisex-hoodie', productType: 'T-SHIRT', tags: [] },
  { title: 'Foam trucker hat', handle: 'foam-trucker-hat', productType: 'EMBROIDERY', tags: [] },
  { title: 'Digital Fauna Signal Tee - White', handle: 'digital-fauna-signal-tee-white', productType: 'T-SHIRT', tags: [] },
  { title: 'Coozie', handle: 'coozie', productType: 'SUBLIMATION', tags: [] },
  { title: 'Tour poster', handle: 'tour-poster', productType: 'POSTER', tags: [] },
  { title: 'Digital Fauna Signal Tee - Black', handle: 'unisex-t-shirt', productType: 'T-SHIRT', tags: [] },
  { title: 'Premium mid-weight hoodie', handle: 'premium-hoodie', productType: 'T-SHIRT', tags: [] },
];

const ordered = orderProductsForMerch(products);

assert.deepEqual(
  ordered.map((product) => product.handle),
  [
    'digital-fauna-signal-tee-white',
    'unisex-t-shirt',
    'unisex-hoodie',
    'premium-hoodie',
    'tour-poster',
    'foam-trucker-hat',
    'coozie',
  ],
  'merch should show T-shirts first, hoodies second, other products next, and hats/koozies last'
);

assert.deepEqual(
  products.map((product) => product.handle),
  [
    'unisex-hoodie',
    'foam-trucker-hat',
    'digital-fauna-signal-tee-white',
    'coozie',
    'tour-poster',
    'unisex-t-shirt',
    'premium-hoodie',
  ],
  'sorting should not mutate the Shopify response array'
);

console.log('Merch product ordering checks passed.');
