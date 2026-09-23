import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const db = await getDb();
    const customerOrders = await db.query.orders.findMany({
      where: eq(schema.orders.customerId, session.userId),
      orderBy: (o, { desc }) => [desc(o.createdAt)],
      with: {
        pickupSlot: true,
        items: {
          with: {
            product: true,
            customisations: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      orders: customerOrders,
    });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
  }
}
