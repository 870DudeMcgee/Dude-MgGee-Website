'use strict';

/**
 * Fetch products from Shopify and normalize them into a clean shape
 * for the Dude McGee merch page. Caches for 45 seconds server-side.
 */

const { storefrontRequest } = require('./shopify-storefront');

const CACHE_TTL_MS = 45 * 1000;
const STALE_TTL_MS = 5 * 60 * 1000;
let cache = null;

const PRODUCT_FIELDS = `
  id
  handle
  title
  description
  descriptionHtml
  vendor
  productType
  availableForSale
  tags
  options { name values }
  featuredImage { url altText width height }
  priceRange {
    minVariantPrice { amount currencyCode }
    maxVariantPrice { amount currencyCode }
  }
  compareAtPriceRange {
    minVariantPrice { amount currencyCode }
  }
  images(first: 10) {
    nodes {
      url
      altText
      width
      height
    }
  }
  variants(first: 50) {
    nodes {
      id
      title
      availableForSale
      price { amount currencyCode }
      compareAtPrice { amount currencyCode }
      image { url altText }
      sku
      selectedOptions { name value }
    }
  }
`;

const CATALOG_QUERY = `
  query DudeMcGeeCatalog {
    products(first: 50, sortKey: CREATED_AT, reverse: true) {
      nodes { ${PRODUCT_FIELDS} }
    }
  }
`;

function normalizeProduct(remoteProduct) {
  const variants = remoteProduct.variants.nodes.map(variant => ({
    id: variant.id,
    title: variant.title,
    available: Boolean(variant.availableForSale),
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    image: variant.image ? variant.image.url : null,
    imageAlt: variant.image ? variant.image.altText : null,
    sku: variant.sku || null,
    selectedOptions: (variant.selectedOptions || []).map(option => ({
      name: option.name,
      value: option.value,
    })),
  }));

  const images = remoteProduct.images.nodes.map(img => ({
    url: img.url,
    alt: img.altText || remoteProduct.title,
  }));

  const minPrice = remoteProduct.priceRange.minVariantPrice;
  const maxPrice = remoteProduct.priceRange.maxVariantPrice;
  const isMultiPrice =
    parseFloat(minPrice.amount) !== parseFloat(maxPrice.amount);

  const compareAt = remoteProduct.compareAtPriceRange.minVariantPrice;
  const hasCompare =
    compareAt &&
    parseFloat(compareAt.amount) > parseFloat(minPrice.amount);

  return {
    id: remoteProduct.id,
    title: remoteProduct.title,
    vendor: remoteProduct.vendor,
    description: remoteProduct.description || '',
    descriptionHtml: remoteProduct.descriptionHtml || '',
    handle: remoteProduct.handle,
    productType: remoteProduct.productType || '',
    availableForSale: remoteProduct.availableForSale,
    tags: remoteProduct.tags || [],
    options: (remoteProduct.options || []).map(option => ({
      name: option.name,
      values: option.values || [],
    })),
    images,
    variants,
    priceRange: remoteProduct.priceRange,
    isMultiPrice,
    hasCompare,
    compareAt: hasCompare ? compareAt : null,
  };
}

function getMerchCategoryRank(product) {
  const searchableText = [
    product.title,
    product.handle,
    product.productType,
    ...(Array.isArray(product.tags) ? product.tags : []),
  ].filter(Boolean).join(' ').toLowerCase();

  // Printful currently reports the hoodies as T-SHIRT, so shopper-facing
  // hoodie language must win before the Shopify product-type fallback.
  if (/\b(hoodie|sweatshirt|pullover)\b/.test(searchableText)) return 1;
  if (/\b(t[ -]?shirt|tee)\b/.test(searchableText)) return 0;
  if (/\b(hat|cap|beanie|trucker|[ck]oozie|can cooler)\b/.test(searchableText)) return 3;
  return 2;
}

function orderProductsForMerch(products) {
  return products
    .map((product, originalIndex) => ({ product, originalIndex }))
    .sort((left, right) => (
      getMerchCategoryRank(left.product) - getMerchCategoryRank(right.product)
      || left.originalIndex - right.originalIndex
    ))
    .map(({ product }) => product);
}

async function loadFreshCatalog(request) {
  const data = await storefrontRequest(CATALOG_QUERY, {}, request);
  const products = orderProductsForMerch(data.products.nodes
    .map(normalizeProduct)
    .filter(Boolean));

  return {
    ok: true,
    source: 'shopify',
    fetchedAt: new Date().toISOString(),
    products,
    errors: [],
  };
}

async function getCatalog(request) {
  const now = Date.now();

  // Cache hit
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) {
    return { ...cache.value, cache: 'hit' };
  }

  try {
    const value = await loadFreshCatalog(request);
    cache = { loadedAt: now, value };
    return { ...value, cache: 'miss' };
  } catch (error) {
    // Serve stale cache if recent enough
    if (cache && now - cache.loadedAt < STALE_TTL_MS) {
      return {
        ...cache.value,
        cache: 'stale',
        errors: cache.value.errors.concat([{
          code: 'shopify_upstream_stale',
          message: 'Serving recent catalog because Shopify is temporarily unavailable.',
        }]),
      };
    }
    throw error;
  }
}

function clearCatalogCache() {
  cache = null;
}

module.exports = { clearCatalogCache, getCatalog, loadFreshCatalog, orderProductsForMerch };
