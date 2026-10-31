'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const m=JSON.parse(fs.readFileSync(path.join(root,'.tools/closure-demo.json'),'utf8'));
const directory=path.resolve(m.directory);
if(path.dirname(directory)!==root || !path.basename(directory).startsWith('.test-db-') || m.database!=='file:'+path.join(directory,'test.db').replace(/\\/g,'/') || !fs.existsSync(path.join(directory,'closure-manifest.json')))throw new Error('Named isolated closure fixture required.');
Object.assign(process.env,{NODE_ENV:'test',SYSTECH_ISOLATED_TESTS:'true',SYSTECH_TEST_PRISMA_CLIENT:path.join(root,'.tools/prisma-cut-reference/client'),DATABASE_URL:m.database,NO_LISTEN:'false',PORT:String(m.apiPort),APP_URL:`http://127.0.0.1:${m.webPort}`,JWT_SECRET:'isolated-closure-demo-secret-at-least-thirty-two-characters',LICENSE_TAX_POLICY:'PENDIENTE',LICENSE_FISCAL_REVIEWED:'false'});
for(const key of ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','RESEND_API_KEY','RESEND_DOMAIN_ID','RESEND_WEBHOOK_SECRET','EMAIL_FROM','FACTURAPI_KEY','META_APP_SECRET','META_WA_ACCESS_TOKEN','META_WA_PHONE_NUMBER_ID','WHATSAPP_API_TOKEN','WHATSAPP_PHONE_NUMBER_ID'])process.env[key]='';
require('./test_prisma_client');require('../apps/api/dist/index');
