const { prisma } = require('@systech/database');
const app = require('../apps/api/dist/index').default;
const server = app.listen(0, '127.0.0.1', () => {
  process.send?.({ base: `http://127.0.0.1:${server.address().port}` });
});
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
};
process.on('SIGTERM', close); process.on('SIGINT', close); process.on('disconnect', close);
