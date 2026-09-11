'use strict';

const assert = require('node:assert/strict');
const {
  clearCatalogCache,
  getCatalog,
  loadFreshCatalog,
} = require('../lib/shopify-catalog');

function connection(nodes, nextCursor = null) {
  return {
    nodes,
    pageInfo: { hasNextPage: Boolean(nextCursor), endCursor: nextCursor },
  };
}

function variant(index) {
  return {
    id: `gid://shopify/ProductVariant/${index}`,
    title: `Size ${index}`,
    availableForSale: true,
    price: { amount: '25.00', currencyCode: 'USD' },
    compareAtPrice: null,
    image: null,
    sku: `SKU-${index}`,
    selectedOptions: [{ name: 'Size', value: String(index) }],
  };
}

function image(index) {
  return {
    id: `gid://shopify/ProductImage/${index}`,
    url: `https://cdn.example/image-${index}.jpg`,
    altText: null,
    width: 800,
    height: 800,
  };
}

function product(index, variants = connection([variant(index)]), images = connection([image(index)])) {
  return {
    id: `gid://shopify/Product/${index}`,
    handle: `product-${index}`,
    title: `Product ${index}`,
    description: `Description ${index}`,
    descriptionHtml: `<p>Description ${index}</p>`,
    vendor: 'Dude McGee',
    productType: 'Accessory',
    availableForSale: true,
    tags: [],
    options: [{ name: 'Size', values: ['One size'] }],
    featuredImage: null,
    priceRange: {
      minVariantPrice: { amount: '25.00', currencyCode: 'USD' },
      maxVariantPrice: { amount: '25.00', currencyCode: 'USD' },
    },
    compareAtPriceRange: { minVariantPrice: null },
    variants,
    images,
  };
}

function queryType(query) {
  if (query.includes('query DudeMcGeeCatalog')) return 'products';
  if (query.includes('query DudeMcGeeProductVariants')) return 'variants';
  if (query.includes('query DudeMcGeeProductImages')) return 'images';
  throw new Error('Unexpected query');
}

async function testProductPages() {
  const first = Array.from({ length: 50 }, (_, index) => product(index + 1));
  const second = [product(51), product(52)];
  const request = async (query, variables) => {
    assert.equal(queryType(query), 'products');
    return { products: variables.productsAfter ? connection(second) : connection(first, 'products-50') };
  };
  const catalog = await loadFreshCatalog({}, request);
  assert.equal(catalog.products.length, 52);
  assert.deepEqual(catalog.products.map(item => item.handle), [...first, ...second].map(item => item.handle));
}

async function testVariantPages() {
  const first = Array.from({ length: 50 }, (_, index) => variant(index + 1));
  const second = [variant(51), variant(52)];
  const remote = product(1, connection(first, 'variants-50'));
  const request = async (query, variables) => {
    const type = queryType(query);
    if (type === 'products') return { products: connection([remote]) };
    assert.equal(type, 'variants');
    assert.equal(variables.productId, remote.id);
    assert.equal(variables.after, 'variants-50');
    return { product: { id: remote.id, variants: connection(second) } };
  };
  const catalog = await loadFreshCatalog({}, request);
  assert.deepEqual(catalog.products[0].variants.map(item => item.id), [...first, ...second].map(item => item.id));
}

async function testImagePages() {
  const first = Array.from({ length: 10 }, (_, index) => image(index + 1));
  first[9].id = null;
  const second = [image(11), image(12)];
  second[0].id = null;
  const remote = product(1, undefined, connection(first, 'images-10'));
  const request = async (query, variables) => {
    const type = queryType(query);
    if (type === 'products') return { products: connection([remote]) };
    assert.equal(type, 'images');
    assert.equal(variables.productId, remote.id);
    assert.equal(variables.after, 'images-10');
    return { product: { id: remote.id, images: connection(second) } };
  };
  const catalog = await loadFreshCatalog({}, request);
  assert.deepEqual(catalog.products[0].images.map(item => item.url), [...first, ...second].map(item => item.url));

  const repeatedUrl = { ...second[0], url: first[9].url };
  await assert.rejects(loadFreshCatalog({}, async (query) => {
    if (queryType(query) === 'products') {
      return { products: connection([product(1, undefined, connection([first[9]], 'images-next'))]) };
    }
    return { product: { id: 'gid://shopify/Product/1', images: connection([repeatedUrl]) } };
  }), /duplicate images/);
}

async function testFailedPages() {
  for (const failedType of ['products', 'variants', 'images']) {
    const remote = product(
      1,
      connection([variant(1)], failedType === 'variants' ? 'variants-next' : null),
      connection([image(1)], failedType === 'images' ? 'images-next' : null)
    );
    const request = async (query, variables) => {
      const type = queryType(query);
      if (type === failedType && (type !== 'products' || variables.productsAfter)) {
        throw new Error(`${failedType} page failed`);
      }
      if (type === 'products') {
        return { products: connection([remote], failedType === 'products' ? 'products-next' : null) };
      }
      throw new Error(`Unexpected ${type} query`);
    };
    await assert.rejects(loadFreshCatalog({}, request), new RegExp(`${failedType} page failed`));
  }

  clearCatalogCache();
  let fail = true;
  const request = async (query, variables) => {
    assert.equal(queryType(query), 'products');
    if (variables.productsAfter && fail) throw new Error('incomplete traversal');
    if (variables.productsAfter) return { products: connection([product(2)]) };
    return { products: connection([product(1)], 'products-next') };
  };
  await assert.rejects(getCatalog({}, request), /incomplete traversal/);
  fail = false;
  const catalog = await getCatalog({}, request);
  assert.equal(catalog.cache, 'miss');
  assert.equal(catalog.products.length, 2);

  const duplicate = product(1);
  await assert.rejects(loadFreshCatalog({}, async () => ({
    products: connection([duplicate, duplicate]),
  })), /duplicate products node/);

  await assert.rejects(loadFreshCatalog({}, async () => ({
    products: {
      nodes: [product(1)],
      pageInfo: { hasNextPage: true, endCursor: null },
    },
  })), /incomplete products cursor/);

  let cursorPage = 0;
  await assert.rejects(loadFreshCatalog({}, async () => ({
    products: connection([product(++cursorPage)], 'repeated-cursor'),
  })), /stalled while paginating products/);
}

async function testStaleCacheRemainsComplete() {
  const originalNow = Date.now;
  let now = 1_000_000;
  Date.now = () => now;
  clearCatalogCache();

  try {
    const originalProducts = [product(10), product(11)];
    const completeRequest = async () => ({ products: connection(originalProducts) });
    const complete = await getCatalog({}, completeRequest);
    assert.equal(complete.cache, 'miss');
    assert.deepEqual(complete.products.map(item => item.handle), ['product-10', 'product-11']);

    const partialThenFailed = async (query, variables) => {
      assert.equal(queryType(query), 'products');
      if (variables.productsAfter) throw new Error('second page failed');
      return { products: connection([product(99)], 'products-next') };
    };
    now += 46_000;
    const stale = await getCatalog({}, partialThenFailed);
    assert.equal(stale.cache, 'stale');
    assert.deepEqual(stale.products, complete.products);
    assert.deepEqual(stale.errors, [{
      code: 'shopify_upstream_stale',
      message: 'Serving recent catalog because Shopify is temporarily unavailable.',
    }]);

    now += 5 * 60 * 1000;
    await assert.rejects(getCatalog({}, partialThenFailed), /second page failed/);
  } finally {
    Date.now = originalNow;
    clearCatalogCache();
  }
}

(async () => {
  await testProductPages();
  await testVariantPages();
  await testImagePages();
  await testFailedPages();
  await testStaleCacheRemainsComplete();
  console.log('Shopify catalog pagination checks passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
