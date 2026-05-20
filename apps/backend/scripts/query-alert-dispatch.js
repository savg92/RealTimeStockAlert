#!/usr/bin/env node
const { PrismaClient } = require('../src/generated/prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.alertDispatch.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('Query failed', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
