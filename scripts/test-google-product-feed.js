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

const factualApparel = {
  ...product,
  title: 'Digital Fauna Tee - White',
  description: 'White unisex T-shirt. Size guide CHEST XS 31-34 2XL 50-53.',
  variants: [{ ...product.variants[0], selectedOptions: [{ name: 'Size', value: '2XL' }] }]
};
const apparelXml = renderGoogleProductFeed({ products: [factualApparel] });
assert.match(apparelXml, /<g:color>White<\/g:color>/);
assert.match(apparelXml, /<g:gender>unisex<\/g:gender>/);
assert.match(apparelXml, /<g:age_group>adult<\/g:age_group>/);
const unknownAudienceXml = renderGoogleProductFeed({ products: [{ ...product, title: 'Neon Trucker Hat - Black', description: 'Black adjustable one-size trucker hat.', variants: [{ ...product.variants[0], selectedOptions: [{ name: 'Title', value: 'Default Title' }] }] }] });
assert.match(unknownAudienceXml, /<g:color>Black<\/g:color>/);
assert.doesNotMatch(unknownAudienceXml, /<g:(?:gender|age_group)>/);
for (const handle of ['foam-trucker-hat', 'foam-trucker-hat-1']) {
  const reviewedHatXml = renderGoogleProductFeed({ products: [{ ...product, handle, title: 'Foam Trucker Hat - Black', description: 'Black adjustable one-size trucker hat.', variants: [{ ...product.variants[0], selectedOptions: [{ name: 'Title', value: 'Default Title' }] }] }] });
  assert.match(reviewedHatXml, /<g:gender>unisex<\/g:gender>/);
  assert.match(reviewedHatXml, /<g:age_group>adult<\/g:age_group>/);
  assert.match(reviewedHatXml, /<g:price>25\.00 USD<\/g:price>/);
}
const youthXml = renderGoogleProductFeed({ products: [{ ...factualApparel, title: 'Youth Signal Tee - White', description: 'White unisex youth T-shirt. Size guide 2XL.' }] });
assert.doesNotMatch(youthXml, /<g:age_group>adult<\/g:age_group>/);
const hoodieShippingXml = renderGoogleProductFeed({ products: [{ ...product, handle: 'unisex-hoodie' }] });
assert.match(hoodieShippingXml, /<g:shipping>[\s\S]*<g:country>US<\/g:country>[\s\S]*<g:price>8\.79 USD<\/g:price>[\s\S]*<g:min_handling_time>2<\/g:min_handling_time>[\s\S]*<g:max_transit_time>8<\/g:max_transit_time>/);
assert.match(hoodieShippingXml, /<g:shipping_handling_business_days>M-F<\/g:shipping_handling_business_days>/);
assert.doesNotMatch(hoodieShippingXml, /<g:region>/);
const unknownShippingXml = renderGoogleProductFeed({ products: [{ ...product, handle: 'future-product' }] });
assert.doesNotMatch(unknownShippingXml, /<g:shipping>|shipping_handling_business_days/);
