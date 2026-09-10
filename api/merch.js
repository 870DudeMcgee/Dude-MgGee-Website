'use strict';

const { getCatalog } = require('../lib/shopify-catalog');
const { createMerchHandler } = require('../lib/dude-merch-route');

module.exports = createMerchHandler(getCatalog);
