import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "BAKER" && session.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Forbidden. Baker access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const pickupDate = searchParams.get("date");
    const status = searchParams.get("status");

    const db = await getDb();

    const conditions = [];
    if (pickupDate && pickupDate !== "all") {
      conditions.push(eq(schema.orders.pickupDate, pickupDate));
    }
    if (status && status !== "all") {
      conditions.push(eq(schema.orders.status, status as any));
    }

    const ordersList = await db.query.orders.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(schema.orders.pickupDate), desc(schema.orders.createdAt)],
      with: {
        customer: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
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
      orders: ordersList,
      totalCount: ordersList.length,
    });
  } catch (error) {
    console.error("Baker orders error:", error);
    return NextResponse.json({ error: "Failed to fetch baker orders." }, { status: 500 });
  }
}
