#!/usr/bin/env node
'use strict';

// During deployment move the authored template out of the public route so
// /merch.html is served by the catalog function. Local checks keep the source.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
// Refuse a build if the packaged feature differs from its exact media binding.
const { manifest, validateManifest, hash } = require('../lib/current-drop');
validateManifest(manifest);
const media = fs.readFileSync(path.join(root, manifest.media.path));
if (media.length !== manifest.media.bytes || hash(media) !== manifest.media.sha256) {
  throw new Error('Featured-drop media does not match the reviewed manifest');
}
const source = path.join(root, 'merch.html');
const target = path.join(root, 'lib', 'merch-template.html');
fs.copyFileSync(source, target);
if (process.env.VERCEL === '1') fs.unlinkSync(source);
