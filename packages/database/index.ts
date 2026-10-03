import { PrismaClient } from '@prisma/client';
import path from 'path';

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.resolve(process.cwd(), 'packages', 'database');

const defaultDbPath = path.resolve(currentDir, 'prisma', 'dev.db');
const rawUrl = process.env.DATABASE_URL;

let finalDbUrl: string | undefined = undefined;
if (!rawUrl || (rawUrl.startsWith('file:') && !path.isAbsolute(rawUrl.replace(/^file:/, '')))) {
  finalDbUrl = `file:${defaultDbPath.replace(/\\/g, '/')}`;
} else {
  finalDbUrl = rawUrl;
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: finalDbUrl
    }
  }
});

export * from '@prisma/client';
