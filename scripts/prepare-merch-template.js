#!/usr/bin/env node
'use strict';

// During deployment move the authored template out of the public route so
// /merch.html is served by the catalog function. Local checks keep the source.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = path.join(root, 'merch.html');
const target = path.join(root, 'lib', 'merch-template.html');
fs.copyFileSync(source, target);
if (process.env.VERCEL === '1') fs.unlinkSync(source);
