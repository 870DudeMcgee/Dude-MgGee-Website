'use strict';

/**
 * POST /api/shopify-cart
 * Validates line items with Shopify, then returns a native cart permalink.
 * Storefront cart tokens stay server-side — the browser never sees them.
 *
 * Request body: { lines: [{ merchandiseId, quantity }], attribution }
 * Response:     { ok: true, checkoutUrl: "https://checkout..." }
 */

const { storefrontRequest, getConfig } = require('../lib/shopify-storefront');
const { normalizeAttribution, cartAttributes } = require('../lib/merch-attribution');
const CART_ATTRIBUTE_KEYS = ['dm_pilot', 'source', 'medium', 'content', 'qa'];

const CART_FIELDS = `
  lines(first: 100) {
    nodes {
      quantity
      merchandise { ... on ProductVariant { id } }
    }
  }
`;

const CART_CREATE = `
  mutation CreateDudeMcGeeCart($input: CartInput!) {
    cartCreate(input: $input) {
      cart { ${CART_FIELDS} }
      userErrors { field message code }
      warnings { code message target }
    }
  }
`;

function sendJson(response, statusCode, payload) {
  response.setHeader('Cache-Control', 'no-store');
  return response.status(statusCode).json(payload);
}

function isSameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function isVariantGid(value) {
  return /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(String(value || ''));
}

function normalizeLines(body) {
  const rawLines = body && Array.isArray(body.lines) ? body.lines : [];
  if (!rawLines.length || rawLines.length > 50) return null;

  const normalized = rawLines.map(line => ({
    merchandiseId: String(line && line.merchandiseId || ''),
    quantity: line && line.quantity,
  }));

  if (normalized.some(line => !isVariantGid(line.merchandiseId) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99)) return null;
  if (new Set(normalized.map(line => line.merchandiseId)).size !== normalized.length) return null;
  return normalized;
}

function returnedLines(cart) {
  const nodes = cart && cart.lines && cart.lines.nodes;
  if (!Array.isArray(nodes) || !nodes.length || nodes.length > 50) return null;
  return normalizeLines({
    lines: nodes.map(node => ({
      merchandiseId: node && node.merchandise && node.merchandise.id,
      quantity: node && node.quantity,
    })),
  });
}

function sameLines(expected, actual) {
  if (!expected || !actual || expected.length !== actual.length) return false;
  const actualByVariant = new Map(actual.map(line => [line.merchandiseId, line.quantity]));
  return expected.every(line => actualByVariant.get(line.merchandiseId) === line.quantity);
}

function numericVariantId(merchandiseId) {
  return String(merchandiseId).slice('gid://shopify/ProductVariant/'.length);
}

function buildCartPermalink(domain, lines, attributes) {
  const shopDomain = String(domain || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)) {
    throw new Error('Shopify store domain is invalid');
  }
  const normalized = normalizeLines({ lines });
  if (!normalized) throw new Error('Verified cart lines are invalid');

  const attributeValues = new Map();
  for (const attribute of attributes || []) {
    if (!attribute || !CART_ATTRIBUTE_KEYS.includes(String(attribute.key)) || typeof attribute.value !== 'string' || attributeValues.has(attribute.key)) {
      throw new Error('Cart attribute is invalid');
    }
    attributeValues.set(attribute.key, attribute.value);
  }

  const path = normalized.map(line => `${numericVariantId(line.merchandiseId)}:${line.quantity}`).join(',');
  const url = new URL(`https://${shopDomain}/cart/${path}`);
  // A Shopify native cart can outlive one visit. Blank values explicitly replace
  // any pilot/QA attributes left by a previous permalink in that browser session.
  for (const key of CART_ATTRIBUTE_KEYS) {
    url.searchParams.append(`attributes[${key}]`, attributeValues.get(key) || '');
  }
  return url.href;
}

function mutationFailure(payload) {
  const errors = payload && payload.userErrors;
  if (!errors || !errors.length) return null;
  return errors.map(error => error.message).join(' ');
}

function createHandler(requestStorefront = storefrontRequest) {
  return async function handler(request, response) {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return sendJson(response, 405, { ok: false, message: 'Method not allowed.' });
    }

    if (!isSameOrigin(request)) {
      return sendJson(response, 403, { ok: false, message: 'Request origin is not allowed.' });
    }

    const lines = normalizeLines(request.body);
    if (!lines) {
      return sendJson(response, 400, { ok: false, message: 'Cart lines are invalid.' });
    }
    const attribution = normalizeAttribution(request.body && request.body.attribution);
    if (!attribution) {
      return sendJson(response, 400, { ok: false, message: 'Cart attribution is invalid.' });
    }

    try {
      const cartInput = {
        lines: lines.map(line => ({
          merchandiseId: line.merchandiseId,
          quantity: line.quantity,
        })),
        attributes: cartAttributes(attribution),
      };

      const data = await requestStorefront(CART_CREATE, { input: cartInput }, request);
      const payload = data.cartCreate;

      const failure = mutationFailure(payload);
      if (failure || !payload.cart) {
        return sendJson(response, 422, {
          ok: false,
          code: 'shopify_cart_rejected',
          message: failure || 'Shopify could not create the cart.',
        });
      }

      const verifiedLines = returnedLines(payload.cart);
      if (!sameLines(lines, verifiedLines)) {
        return sendJson(response, 422, {
          ok: false,
          code: 'shopify_cart_mismatch',
          message: 'Shopify could not prepare the requested cart exactly.',
        });
      }

      const checkoutUrl = buildCartPermalink(getConfig().domain, verifiedLines, cartInput.attributes);

      return sendJson(response, 200, {
        ok: true,
        checkoutUrl,
        warnings: (payload.warnings || []).map(w => w.message),
      });
    } catch (error) {
      console.error('Shopify cart creation failed', {
        message: error.message,
      });
      return sendJson(response, 502, {
        ok: false,
        code: 'shopify_cart_unavailable',
        message: 'Secure checkout is temporarily unavailable. Please try again.',
      });
    }
  };
}

const handler = createHandler();
module.exports = handler;
module.exports.createHandler = createHandler;
module.exports.normalizeLines = normalizeLines;
module.exports.returnedLines = returnedLines;
module.exports.sameLines = sameLines;
module.exports.buildCartPermalink = buildCartPermalink;
