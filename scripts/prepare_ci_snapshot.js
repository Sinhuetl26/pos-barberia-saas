'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createTestFixture, seedTestFixture, cleanTestFixture } = require('./test_fixture');
// Separate process: prepare synthetic SQLite input without inheriting PostgreSQL fixture selection.
delete process.env.SYSTECH_TEST_PG_URL;
delete process.env.SYSTECH_TEST_PRISMA_CLIENT;
const fixture = createTestFixture();
try {
  seedTestFixture(fixture.env);
  const destination = path.resolve(__dirname, '..', '.tools', 'ci-source.db');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(fixture.directory, 'test.db'), destination);
  console.log('Synthetic SQLite snapshot prepared for CI.');
} finally { cleanTestFixture(fixture.directory); }
