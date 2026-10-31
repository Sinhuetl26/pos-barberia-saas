'use strict';
const fs = require('node:fs');
const manifest = JSON.parse(fs.readFileSync('.tools/product-complete-demo.json', 'utf8'));
process.env.DATABASE_URL = manifest.database;
process.env.NODE_ENV = 'test';
const {startInventoryCount} = require('../apps/api/dist/services/inventory-count.service');
startInventoryCount({tenantId:manifest.tenantId,userId:manifest.ownerId,email:'dueno-cierre@fixture.invalid',rol:'DUENO',branchIds:null},
  {sucursalId:manifest.branchId,productoIds:[manifest.productIds[1],manifest.productIds[2]]}, 'diagnostic-fictitious-count')
  .then(result => console.log('Count created on isolated copy:', result.id, result.items.length))
  .catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => require('@systech/database').prisma.$disconnect());
