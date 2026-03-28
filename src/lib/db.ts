import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { normalizeDatabaseUrlForPgSsl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrisma(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  const url = normalizeDatabaseUrlForPgSsl(raw);
  if (!url?.trim()) {
    throw new Error(
      "DATABASE_URL manquant dans .env. Exemple : postgresql://USER:PASS@localhost:5432/nexora?schema=public"
    );
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();
globalForPrisma.prisma = prisma;
