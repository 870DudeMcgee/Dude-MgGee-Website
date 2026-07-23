'use strict';

/**
 * POST /api/shopify-cart
 * Creates a Shopify cart from line items, returns the checkout URL.
 * Token stays server-side — the browser never sees it.
 *
 * Request body: { lines: [{ merchandiseId, quantity }] }
 * Response:     { ok: true, checkoutUrl: "https://checkout..." }
 */

const { storefrontRequest } = require('../lib/shopify-storefront');

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  lines(first: 100) {
    nodes {
      id
      quantity
      merchandise { ... on ProductVariant { id title } }
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
    quantity: Math.max(1, Math.min(99, Number(line && line.quantity) || 1)),
  }));

  if (normalized.some(line => !isVariantGid(line.merchandiseId))) return null;
  return normalized;
}

function mutationFailure(payload) {
  const errors = payload && payload.userErrors;
  if (!errors || !errors.length) return null;
  return errors.map(error => error.message).join(' ');
}

module.exports = async function handler(request, response) {
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

  try {
    const cartInput = {
      lines: lines.map(line => ({
        merchandiseId: line.merchandiseId,
        quantity: line.quantity,
      })),
    };

    const data = await storefrontRequest(CART_CREATE, { input: cartInput }, request);
    const payload = data.cartCreate;

    const failure = mutationFailure(payload);
    if (failure || !payload.cart) {
      return sendJson(response, 422, {
        ok: false,
        code: 'shopify_cart_rejected',
        message: failure || 'Shopify could not create the cart.',
      });
    }

    return sendJson(response, 200, {
      ok: true,
      cartId: payload.cart.id,
      checkoutUrl: payload.cart.checkoutUrl,
      warnings: (payload.warnings || []).map(w => w.message),
    });
  } catch (error) {
    console.error('Shopify cart creation failed', {
      message: error.message,
      details: error.details || null,
    });
    return sendJson(response, 502, {
      ok: false,
      code: 'shopify_cart_unavailable',
      message: 'Secure checkout is temporarily unavailable. Please try again.',
    });
  }
};
