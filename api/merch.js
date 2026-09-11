'use strict';

const { getCatalog } = require('../lib/shopify-catalog');
const { createMerchHandler } = require('../lib/dude-merch-route');

const { currentDrop } = require('../lib/featured-drop-reader');
module.exports = createMerchHandler(getCatalog, undefined, currentDrop);
