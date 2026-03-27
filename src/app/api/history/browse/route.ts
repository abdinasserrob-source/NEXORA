import { BrowseEventType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const onlySearch = url.searchParams.get("searchOnly") === "1";
  const events = await prisma.browseEvent.findMany({
    where: {
      userId: user.id,
      ...(onlySearch ? { type: BrowseEventType.SEARCH } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: onlySearch ? 100 : 200,
    include: { product: true },
  });
  return NextResponse.json({ events });
}
