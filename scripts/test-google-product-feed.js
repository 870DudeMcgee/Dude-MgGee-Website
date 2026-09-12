'use strict';
const assert = require('node:assert/strict');
const { renderGoogleProductFeed, createGoogleProductFeedHandler } = require('../lib/google-product-feed');
const { structuredData } = require('../lib/dude-product-route');
const { PRODUCT_POLICIES } = require('../lib/product-policies');

assert.deepEqual([...PRODUCT_POLICIES.keys()], [
  'digital-fauna-signal-tee-chest-logo-white',
  'digital-fauna-signal-tee-white',
  'unisex-t-shirt',
  'checkout-girl-tee',
  'unisex-premium-mid-weight-hoodie-2',
  'unisex-hoodie',
  'unisex-premium-mid-weight-hoodie-1',
  'unisex-premium-mid-weight-hoodie',
  'foam-trucker-hat-1',
  'foam-trucker-hat',
  'coozie',
]);
const product = { id: 'gid://shopify/Product/44', handle: 'digital-fauna-signal-tee-white', title: 'Signal & Tee', description: 'A <strong>shirt</strong> & more\u0001.', vendor: 'Dude & McGee', images: [{ url: 'https://cdn.example/tee?a=1&b=2' }, { url: 'https://cdn.example/tee-back.jpg' }], options: [{ name: 'Color' }, { name: 'Size' }], variants: [{ id: 'gid://shopify/ProductVariant/101', available: false, price: { amount: '25.00', currencyCode: 'USD' }, selectedOptions: [{ name: 'Color', value: 'Black & White' }, { name: 'Size', value: 'M' }] }] };
const xml = renderGoogleProductFeed({ products: [product] });
assert.match(xml, /<g:id>101<\/g:id>/); assert.match(xml, /<g:item_group_id>44<\/g:item_group_id>/); assert.match(xml, /products\/digital-fauna-signal-tee-white\?variant=101/); assert.match(xml, /<g:price>25\.00 USD<\/g:price>/); assert.match(xml, /<g:availability>out_of_stock/); assert.match(xml, /Black &amp; White/); assert.doesNotMatch(xml, /\u0001/);
assert.match(xml, /<g:title>Dude McGee Signal &amp; Tee<\/g:title>/);
assert.match(xml, /<g:size>M<\/g:size>/, 'a branded title must preserve the variant size field');
assert.match(xml, /<g:brand>Dude &amp; McGee<\/g:brand>/, 'the Shopify vendor remains the feed brand');
assert.doesNotMatch(renderGoogleProductFeed({ products: [{ ...product, title: 'Dude McGee Signal Tee' }] }), /Dude McGee Dude McGee/);
assert.match(xml, /<g:additional_image_link>https:\/\/cdn\.example\/tee-back\.jpg<\/g:additional_image_link>/);
for (const [handle, policy] of PRODUCT_POLICIES) {
  const mappedProduct = { ...product, handle };
  const mappedFeed = renderGoogleProductFeed({ products: [mappedProduct] });
  const mappedSchema = structuredData(mappedProduct);
  assert.match(mappedFeed, new RegExp(`<g:price>${policy.shipping.price.replace('.', '\\.')} USD<\\/g:price>`), `${handle} feed uses its shared shipping profile`);
  assert.equal(mappedSchema.offers.shippingDetails.shippingRate.value, policy.shipping.price, `${handle} schema uses its shared shipping profile`);
}
function response() { return { headers:{}, setHeader(k,v){this.headers[k]=v;}, status(c){this.code=c;return this;}, send(b){this.body=b;return this;} }; }
(async () => {
  const handler = createGoogleProductFeedHandler({ getCatalog: async () => ({ products: [product] }) });
  const head = response();
  await handler({ method: 'HEAD' }, head);
  assert.equal(head.code, 200);
  assert.equal(head.body, '');

  const unavailable = response();
  const unknownPolicy = response();
  const old = console.error;
  console.error = () => {};
  await createGoogleProductFeedHandler({ getCatalog: async () => ({ products: [] }) })({ method: 'GET' }, unavailable);
  await createGoogleProductFeedHandler({ getCatalog: async () => ({ products: [{ ...product, handle: 'future-product' }] }) })({ method: 'GET' }, unknownPolicy);
  console.error = old;
  assert.equal(unavailable.code, 503);
  assert.equal(unknownPolicy.code, 503);
  assert.equal(unknownPolicy.headers['Cache-Control'], 'no-store');
  console.log('Dude Google product feed checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });

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
assert.throws(() => renderGoogleProductFeed({ products: [{ ...product, handle: 'future-product' }] }), /Missing verified product policy for future-product/);

const checkoutSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
const checkoutGirlXml = renderGoogleProductFeed({ products: [{
  ...product,
  handle: 'checkout-girl-tee',
  title: 'Checkout Girl Tee',
  description: 'Heather gray Bella + Canvas 3001 unisex jersey short sleeve tee.',
  vendor: 'Dude McGee Merch',
  variants: checkoutSizes.map((size, index) => ({
    ...product.variants[0],
    id: `gid://shopify/ProductVariant/${201 + index}`,
    selectedOptions: [{ name: 'Size', value: size }],
  })),
}] });
assert.equal((checkoutGirlXml.match(/<g:color>Heather gray<\/g:color>/g) || []).length, 9);
assert.equal((checkoutGirlXml.match(/<g:gender>unisex<\/g:gender>/g) || []).length, 9);
assert.equal((checkoutGirlXml.match(/<g:price>4\.95 USD<\/g:price>/g) || []).length, 9);
assert.equal((checkoutGirlXml.match(/<g:brand>Dude McGee Merch<\/g:brand>/g) || []).length, 9);
assert.deepEqual(PRODUCT_POLICIES.get('checkout-girl-tee').source, {
  shopifyShippingProfileId: '133064753459',
  shopifyProductId: '10448707715379',
  printfulStoreId: '18505090',
  printfulSyncedProductId: '470134813',
  printfulProductCode: 'PF-FRG1001',
});

const manyImages = Array.from({ length: 12 }, (_, index) => ({ url: `https://cdn.example/catalog-${index + 1}.jpg` }));
const imageLimitXml = renderGoogleProductFeed({ products: [{
  ...product,
  images: manyImages,
  variants: [{ ...product.variants[0], image: 'https://cdn.example/variant-only.jpg' }],
}] });
assert.match(imageLimitXml, /<g:image_link>https:\/\/cdn\.example\/variant-only\.jpg<\/g:image_link>/);
assert.equal((imageLimitXml.match(/<g:additional_image_link>/g) || []).length, 10);
assert.doesNotMatch(imageLimitXml, /<g:additional_image_link>https:\/\/cdn\.example\/variant-only\.jpg/);
assert.doesNotMatch(imageLimitXml, /catalog-11\.jpg|catalog-12\.jpg/);
