'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, '.tools/product-complete-demo.json'), 'utf8'));
const directory = path.resolve(manifest.directory);
if (directory !== path.join(root, '.tools/product-complete-demo') || manifest.database !== 'file:' + path.join(directory, 'test.db').replace(/\\/g, '/')) throw new Error('Named product fixture required.');
Object.assign(process.env, {NODE_ENV:'test', SYSTECH_ISOLATED_TESTS:'true', DATABASE_URL:manifest.database,
  NO_LISTEN:'false', PORT:String(manifest.apiPort), APP_URL:`http://127.0.0.1:${manifest.webPort}`,
  JWT_SECRET:'isolated-product-demo-secret-at-least-thirty-two-characters', LICENSE_TAX_POLICY:'PENDIENTE', LICENSE_FISCAL_REVIEWED:'false'});
delete process.env.SYSTECH_TEST_PRISMA_CLIENT;
for (const key of ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','RESEND_API_KEY','RESEND_DOMAIN_ID','RESEND_WEBHOOK_SECRET','EMAIL_FROM','FACTURAPI_KEY','META_APP_SECRET','META_WA_ACCESS_TOKEN','META_WA_PHONE_NUMBER_ID','WHATSAPP_API_TOKEN','WHATSAPP_PHONE_NUMBER_ID']) process.env[key] = '';
require('../apps/api/dist/index');
