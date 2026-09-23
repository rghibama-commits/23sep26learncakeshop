import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

const ALLOWED_STATUSES = ["CONFIRMED", "BAKING", "READY", "COLLECTED", "CANCELLED", "REFUNDED"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "BAKER" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden. Baker access required." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body;

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const db = await getDb();

    const [existingOrder] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, id));

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const now = new Date();

    const [updatedOrder] = await db
      .update(schema.orders)
      .set({
        status,
        specialNotes: notes ? `${existingOrder.specialNotes || ""}\n[Baker Note]: ${notes}`.trim() : existingOrder.specialNotes,
        updatedAt: now,
      })
      .where(eq(schema.orders.id, id))
      .returning();

    // Audit log
    await db.insert(schema.auditLogs).values({
      entityType: "ORDER",
      entityId: id,
      action: `STATUS_UPDATED_TO_${status}`,
      performedBy: session.userId,
      details: {
        previousStatus: existingOrder.status,
        newStatus: status,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order ${updatedOrder.orderNumber} updated to ${status}.`,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return NextResponse.json({ error: "Failed to update order status." }, { status: 500 });
  }
}
