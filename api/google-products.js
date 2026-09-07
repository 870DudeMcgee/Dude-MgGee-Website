'use strict';
const { getCatalog } = require('../lib/shopify-catalog');
const { createGoogleProductFeedHandler } = require('../lib/google-product-feed');
module.exports = createGoogleProductFeedHandler({ getCatalog });
