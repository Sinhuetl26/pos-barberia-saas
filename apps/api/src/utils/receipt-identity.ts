import type { PrismaClient } from '@prisma/client';

function personName(value: unknown) {
  return typeof value === 'string' && value.trim() && !value.includes('@') ? value.trim() : null;
}

export async function receiptCollectorName(db: Pick<PrismaClient, 'usuario'>, tenantId: string, userId: string | null | undefined, snapshot?: string | null): Promise<string> {
  const stored = personName(snapshot);
  if (stored) return stored;
  // Older sales stored an email as the name; resolve only within their business.
  const user = userId ? await db.usuario.findFirst({ where: { id: userId, tenantId }, select: { nombre: true } }) : null;
  return personName(user?.nombre) || 'Nombre no disponible';
}
