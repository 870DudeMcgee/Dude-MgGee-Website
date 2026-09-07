'use strict';

const { getCatalog } = require('../../lib/shopify-catalog');
const { createProductHandler } = require('../../lib/dude-product-route');

module.exports = createProductHandler(getCatalog);
