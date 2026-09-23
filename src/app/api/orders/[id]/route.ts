import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq, or } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();

    // Query by order id or orderNumber
    const order = await db.query.orders.findFirst({
      where: or(eq(schema.orders.id, id), eq(schema.orders.orderNumber, id)),
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
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Customer isolation check: Customer can only view their own order
    if (session.role === "CUSTOMER" && order.customerId !== session.userId) {
      return NextResponse.json(
        { error: "Access denied. You cannot access another customer's order." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Fetch single order error:", error);
    return NextResponse.json({ error: "Failed to fetch order." }, { status: 500 });
  }
}
