import { connection } from "next/server";
import { CategoriesCatalog } from "./CategoriesCatalog";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await connection();
  return <CategoriesCatalog />;
}
