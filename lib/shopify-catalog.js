'use strict';

/**
 * Fetch products from Shopify and normalize them into a clean shape
 * for the Dude McGee merch page. Caches for 45 seconds server-side.
 */

const { storefrontRequest } = require('./shopify-storefront');

const CACHE_TTL_MS = 45 * 1000;
const STALE_TTL_MS = 5 * 60 * 1000;
let cache = null;

const IMAGE_FIELDS = `
  id
  url
  altText
  width
  height
`;

const VARIANT_FIELDS = `
  id
  title
  availableForSale
  price { amount currencyCode }
  compareAtPrice { amount currencyCode }
  image { url altText }
  sku
  selectedOptions { name value }
`;

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
    nodes { ${IMAGE_FIELDS} }
    pageInfo { hasNextPage endCursor }
  }
  variants(first: 50) {
    nodes { ${VARIANT_FIELDS} }
    pageInfo { hasNextPage endCursor }
  }
`;

const CATALOG_QUERY = `
  query DudeMcGeeCatalog($productsAfter: String) {
    products(first: 50, after: $productsAfter, sortKey: CREATED_AT, reverse: true) {
      nodes { ${PRODUCT_FIELDS} }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const PRODUCT_VARIANTS_QUERY = `
  query DudeMcGeeProductVariants($productId: ID!, $after: String) {
    product(id: $productId) {
      id
      variants(first: 50, after: $after) {
        nodes { ${VARIANT_FIELDS} }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

const PRODUCT_IMAGES_QUERY = `
  query DudeMcGeeProductImages($productId: ID!, $after: String) {
    product(id: $productId) {
      id
      images(first: 10, after: $after) {
        nodes { ${IMAGE_FIELDS} }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

function validateConnection(connection, label) {
  if (!connection || !Array.isArray(connection.nodes) ||
      !connection.pageInfo || typeof connection.pageInfo.hasNextPage !== 'boolean') {
    throw new Error(`Shopify returned an incomplete ${label} connection`);
  }
  if (connection.pageInfo.hasNextPage && !connection.pageInfo.endCursor) {
    throw new Error(`Shopify returned an incomplete ${label} cursor`);
  }
}

async function paginateConnection(initialConnection, label, keyForNode, fetchNextPage) {
  validateConnection(initialConnection, label);
  const nodes = [];
  const nodeKeys = new Set();
  const cursors = new Set();
  let connection = initialConnection;

  while (true) {
    for (const node of connection.nodes) {
      const key = node && keyForNode(node);
      if (!key || nodeKeys.has(key)) {
        throw new Error(`Shopify returned an invalid or duplicate ${label} node`);
      }
      nodeKeys.add(key);
      nodes.push(node);
    }

    if (!connection.pageInfo.hasNextPage) return nodes;
    const cursor = connection.pageInfo.endCursor;
    if (cursors.has(cursor)) throw new Error(`Shopify stalled while paginating ${label}`);
    cursors.add(cursor);
    connection = await fetchNextPage(cursor);
    validateConnection(connection, label);
  }
}

async function completeProductConnections(product, request, requestStorefront) {
  if (!product || !product.id) throw new Error('Shopify returned an invalid product');
  const variants = await paginateConnection(
    product.variants,
    `variants for ${product.id}`,
    variant => variant.id,
    async after => {
      const data = await requestStorefront(PRODUCT_VARIANTS_QUERY, { productId: product.id, after }, request);
      if (!data.product || data.product.id !== product.id) {
        throw new Error(`Shopify omitted product ${product.id} while paginating variants`);
      }
      return data.product.variants;
    }
  );
  const images = await paginateConnection(
    product.images,
    `images for ${product.id}`,
    image => image.id ? `id:${image.id}` : image.url ? `url:${image.url}` : null,
    async after => {
      const data = await requestStorefront(PRODUCT_IMAGES_QUERY, { productId: product.id, after }, request);
      if (!data.product || data.product.id !== product.id) {
        throw new Error(`Shopify omitted product ${product.id} while paginating images`);
      }
      return data.product.images;
    }
  );
  return { ...product, variants: { nodes: variants }, images: { nodes: images } };
}

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

async function loadFreshCatalog(request, requestStorefront = storefrontRequest) {
  const firstPage = await requestStorefront(CATALOG_QUERY, { productsAfter: null }, request);
  const remoteProducts = await paginateConnection(
    firstPage.products,
    'products',
    product => product.id,
    async productsAfter => {
      const data = await requestStorefront(CATALOG_QUERY, { productsAfter }, request);
      return data.products;
    }
  );
  const completeProducts = [];
  for (const product of remoteProducts) {
    completeProducts.push(await completeProductConnections(product, request, requestStorefront));
  }
  const products = orderProductsForMerch(completeProducts
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

async function getCatalog(request, requestStorefront = storefrontRequest) {
  const now = Date.now();

  // Cache hit
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) {
    return { ...cache.value, cache: 'hit' };
  }

  try {
    const value = await loadFreshCatalog(request, requestStorefront);
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
