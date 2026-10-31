'use strict';
// shortcut: one local demo writer; use PostgreSQL before deploying real tenants.
const fs = require('node:fs');
const path = require('node:path');
function initializeDemo(dataDir, seedFile) {
  const file = path.join(dataDir, 'test.db');
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(file)) {
    fs.copyFileSync(seedFile, file, fs.constants.COPYFILE_EXCL);
  }
  const fd = fs.openSync(file, 'r');
  try {
    const header = Buffer.alloc(16);
    fs.readSync(fd, header, 0, 16, 0);
    if (header.toString() !== 'SQLite format 3\0') throw Error('Invalid demo database; refusing to start');
  } finally { fs.closeSync(fd); }
  return file;
}
module.exports = { initializeDemo };
if (require.main === module) {
  const file = initializeDemo('/data', '/seed/test.db');
  Object.assign(process.env, {
    NODE_ENV: 'test', SYSTECH_ISOLATED_TESTS: 'true', DATABASE_URL: 'file:' + file,
    PORT: '3103', NO_LISTEN: 'false',
    JWT_SECRET: 'isolated-product-demo-secret-at-least-thirty-two-characters',
    LICENSE_TAX_POLICY: 'PENDIENTE', LICENSE_FISCAL_REVIEWED: 'false'
  });
  delete process.env.SYSTECH_TEST_PRISMA_CLIENT;
  for (const key of ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','RESEND_API_KEY','RESEND_DOMAIN_ID','RESEND_WEBHOOK_SECRET','EMAIL_FROM','FACTURAPI_KEY','META_APP_SECRET','META_WA_ACCESS_TOKEN','META_WA_PHONE_NUMBER_ID','WHATSAPP_API_TOKEN','WHATSAPP_PHONE_NUMBER_ID']) process.env[key] = '';
  require('../apps/api/dist/index.js');
}
