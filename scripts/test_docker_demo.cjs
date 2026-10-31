'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { initializeDemo } = require('./docker-demo-api.cjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'systech-docker-demo-'));
try {
  const seed = path.join(temp, 'seed.db');
  fs.writeFileSync(seed, 'SQLite format 3\0original');
  const file = initializeDemo(path.join(temp, 'data'), seed);
  assert.equal(fs.readFileSync(file, 'utf8'), 'SQLite format 3\0original');
  fs.appendFileSync(file, '-persisted');
  fs.writeFileSync(seed, 'SQLite format 3\0new-seed');
  initializeDemo(path.join(temp, 'data'), seed);
  assert.equal(fs.readFileSync(file, 'utf8'), 'SQLite format 3\0original-persisted');
  fs.writeFileSync(file, 'invalid');
  assert.throws(() => initializeDemo(path.join(temp, 'data'), seed), /Invalid demo/);
  assert.throws(() => initializeDemo(path.join(temp, 'missing'), path.join(temp, 'absent.db')));
  console.log('PASS: seed once, persistent data preserved, invalid database rejected, missing seed rejected.');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
