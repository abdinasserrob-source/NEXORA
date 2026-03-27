import { prisma } from "@/lib/db";

/**
 * Résout un slug de catégorie vers tous les IDs de la branche (catégorie + descendants).
 * Utilisé pour filtrer les produits de façon stricte par `categoryId`.
 */
export async function getCategoryBranchIdsBySlug(slug: string): Promise<string[] | null> {
  const root = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!root) return null;

  const ids: string[] = [root.id];
  let frontier: string[] = [root.id];

  while (frontier.length > 0) {
    const children = await prisma.category.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((c) => c.id);
    for (const id of frontier) ids.push(id);
  }

  return ids;
}
