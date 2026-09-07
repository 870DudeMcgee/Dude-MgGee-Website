'use strict';
const assert = require('node:assert/strict');
const { renderGoogleProductFeed, createGoogleProductFeedHandler } = require('../lib/google-product-feed');
const product = { id: 'gid://shopify/Product/44', handle: 'signal-tee', title: 'Signal & Tee', description: 'A <strong>shirt</strong> & more\u0001.', vendor: 'Dude & McGee', images: [{ url: 'https://cdn.example/tee?a=1&b=2' }], options: [{ name: 'Color' }, { name: 'Size' }], variants: [{ id: 'gid://shopify/ProductVariant/101', available: false, price: { amount: '25.00', currencyCode: 'USD' }, selectedOptions: [{ name: 'Color', value: 'Black & White' }, { name: 'Size', value: 'M' }] }] };
const xml = renderGoogleProductFeed({ products: [product] });
assert.match(xml, /<g:id>101<\/g:id>/); assert.match(xml, /<g:item_group_id>44<\/g:item_group_id>/); assert.match(xml, /products\/signal-tee\?variant=101/); assert.match(xml, /<g:price>25\.00 USD<\/g:price>/); assert.match(xml, /<g:availability>out_of_stock/); assert.match(xml, /Black &amp; White/); assert.doesNotMatch(xml, /\u0001/);
function response() { return { headers:{}, setHeader(k,v){this.headers[k]=v;}, status(c){this.code=c;return this;}, send(b){this.body=b;return this;} }; }
(async () => { const handler = createGoogleProductFeedHandler({ getCatalog: async () => ({ products: [product] }) }); const head=response(); await handler({method:'HEAD'}, head); assert.equal(head.code,200); assert.equal(head.body,''); const unavailable=response(); const old=console.error; console.error=()=>{}; await createGoogleProductFeedHandler({getCatalog:async()=>({products:[]})})({method:'GET'},unavailable); console.error=old; assert.equal(unavailable.code,503); console.log('Dude Google product feed checks passed.'); })().catch(error=>{ console.error(error); process.exitCode=1; });

product.variants[0].image = 'https://cdn.example/exact-variant.jpg';
assert.match(renderGoogleProductFeed({ products: [product] }), /<g:image_link>https:\/\/cdn.example\/exact-variant.jpg<\/g:image_link>/);
