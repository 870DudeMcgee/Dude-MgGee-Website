'use strict';

const BASE_SHIPPING = Object.freeze({
  country: 'US',
  service: 'Standard',
  currency: 'USD',
  minHandlingDays: 2,
  maxHandlingDays: 5,
  minTransitDays: 1,
  maxTransitDays: 8,
  businessDays: 'M-F',
});

function profile(price, attributes = {}, source) {
  return Object.freeze({
    shipping: Object.freeze({ ...BASE_SHIPPING, price }),
    attributes: Object.freeze({ ...attributes }),
    ...(source ? { source: Object.freeze({ ...source }) } : {}),
  });
}

const PRODUCT_POLICIES = new Map([
  ['digital-fauna-signal-tee-chest-logo-white', profile('4.95')],
  ['digital-fauna-signal-tee-white', profile('4.95')],
  ['unisex-t-shirt', profile('4.95')],
  ['checkout-girl-tee', profile('4.95', { color: 'Heather gray', gender: 'unisex' }, {
    shopifyShippingProfileId: '133064753459',
    shopifyProductId: '10448707715379',
    printfulStoreId: '18505090',
    printfulSyncedProductId: '470134813',
    printfulProductCode: 'PF-FRG1001',
  })],
  ['unisex-premium-mid-weight-hoodie-2', profile('8.79')],
  ['unisex-hoodie', profile('8.79')],
  ['unisex-premium-mid-weight-hoodie-1', profile('8.79')],
  ['unisex-premium-mid-weight-hoodie', profile('8.79')],
  ['foam-trucker-hat-1', profile('4.69', { gender: 'unisex', age_group: 'adult' })],
  ['foam-trucker-hat', profile('4.69', { gender: 'unisex', age_group: 'adult' })],
  ['coozie', profile('4.69')],
]);

function getProductPolicy(product) {
  return PRODUCT_POLICIES.get(String(product && product.handle || '')) || null;
}

function requireProductPolicy(product) {
  const policy = getProductPolicy(product);
  if (!policy) throw new Error(`Missing verified product policy for ${product && product.handle || 'unknown product'}`);
  return policy;
}

function productAttributes(product, description) {
  const fields = {};
  const color = String(product && product.title || '').match(/\b(black|white)\s*$/i);
  if (color) fields.color = color[1].charAt(0).toUpperCase() + color[1].slice(1).toLowerCase();

  const copy = `${product && product.title || ''} ${description || ''}`;
  const isGarment = /\b(?:t[ -]?shirt|tee|hoodie|sweatshirt)\b/i.test(copy);
  const isUnisex = /\bunisex\b/i.test(copy);
  const isExplicitlyYouth = /\b(?:kids?|youth|baby|toddler|infant|children'?s)\b/i.test(copy);
  const hasAdultSizeGuide = /size guide/i.test(copy) && /\b(?:2xl|3xl|4xl|5xl)\b/i.test(copy);
  if (isGarment && isUnisex) fields.gender = 'unisex';
  if (isGarment && hasAdultSizeGuide && !isExplicitlyYouth) fields.age_group = 'adult';
  return { ...fields, ...(getProductPolicy(product)?.attributes || {}) };
}

function offerShippingDetails(policy) {
  const shipping = policy.shipping;
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: shipping.price,
      currency: shipping.currency,
    },
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: shipping.country,
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      businessDays: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'https://schema.org/Monday',
          'https://schema.org/Tuesday',
          'https://schema.org/Wednesday',
          'https://schema.org/Thursday',
          'https://schema.org/Friday',
        ],
      },
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: shipping.minHandlingDays,
        maxValue: shipping.maxHandlingDays,
        unitCode: 'DAY',
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: shipping.minTransitDays,
        maxValue: shipping.maxTransitDays,
        unitCode: 'DAY',
      },
    },
  };
}

function merchantReturnPolicy() {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'US',
    returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
    merchantReturnLink: 'https://www.dudemcgee.com/returns.html',
  };
}

function schemaProductProperties(attributes) {
  const audience = {};
  if (attributes.gender) audience.suggestedGender = attributes.gender === 'unisex' ? 'Unisex' : attributes.gender;
  if (attributes.age_group === 'adult') audience.suggestedMinAge = 13;
  return {
    ...(attributes.color ? { color: attributes.color } : {}),
    ...(Object.keys(audience).length ? { audience: { '@type': 'PeopleAudience', ...audience } } : {}),
  };
}

module.exports = {
  PRODUCT_POLICIES,
  getProductPolicy,
  merchantReturnPolicy,
  offerShippingDetails,
  productAttributes,
  requireProductPolicy,
  schemaProductProperties,
};
