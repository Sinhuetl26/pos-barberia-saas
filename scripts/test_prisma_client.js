'use strict';

// Preload only an explicitly isolated generated client. Never replace the demo SDK.
const Module = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
if (process.env.SYSTECH_TEST_PRISMA_CLIENT) {
  if (process.env.SYSTECH_ISOLATED_TESTS !== 'true' || process.env.NODE_ENV !== 'test') throw new Error('Test client requires an isolated test process.');
  const client = path.resolve(process.env.SYSTECH_TEST_PRISMA_CLIENT);
  const allowed = ['prisma-postgres', 'prisma-sqlite', 'prisma-uiux', 'prisma-uiux-postgres', 'prisma-cut-reference', 'prisma-cut-reference-postgres'].map(name => path.resolve(__dirname, '..', '.tools', name, 'client'));
  if (!allowed.includes(client) || !fs.existsSync(path.join(client, 'index.js'))) throw new Error('Unexpected test client path.');
  const original = Module._resolveFilename;
  Module._resolveFilename = function (name, parent, ...rest) {
    return original.call(this, name === '@prisma/client' ? client : name, parent, ...rest);
  };
}
