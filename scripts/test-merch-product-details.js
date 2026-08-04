#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'merch.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'merch.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'merch.css'), 'utf8');

assert.match(html, /<dialog[^>]+id="product-details"[^>]+aria-labelledby="product-details-title"/);
assert.match(html, /id="product-details-description"/);
assert.match(script, /detailsButton\.textContent = "View full description →"/);
assert.match(script, /this\.description\.textContent = stripHtml\(product\.description\)/);
assert.match(script, /this\.dialog\.showModal\(\)/);
assert.match(styles, /\.product-details-content\s*\{/);
assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.product-details-content \{ grid-template-columns: 1fr; \}/);

console.log('Merch product detail UI contract checks passed.');
