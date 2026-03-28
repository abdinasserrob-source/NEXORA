import { NextResponse } from "next/server";

/** @deprecated Utilisez `POST /api/orders/[orderId]/return-request` (Mes commandes). */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Cette API est remplacée. Ouvrez Mes commandes et utilisez « Retourner un article », ou POST /api/orders/{orderId}/return-request.",
    },
    { status: 410 }
  );
}
