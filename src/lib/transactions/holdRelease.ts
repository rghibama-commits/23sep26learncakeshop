import { getDb, schema } from "@/db";
import { sql, eq, and, lt, ne } from "drizzle-orm";

export interface ReleaseExpiredHoldsResult {
  success: boolean;
  releasedCount: number;
  expiredOrderNumbers: string[];
}

export async function releaseExpiredHolds(): Promise<ReleaseExpiredHoldsResult> {
  const db = await getDb();
  const now = new Date();

  // Find pending orders that have passed their expiration time
  const expiredOrders = await db
    .select({
      id: schema.orders.id,
      orderNumber: schema.orders.orderNumber,
      pickupDate: schema.orders.pickupDate,
      pickupSlotId: schema.orders.pickupSlotId,
      status: schema.orders.status,
    })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.status, "PENDING"),
        lt(schema.orders.expiresAt, now),
        ne(schema.orders.paymentStatus, "PAID")
      )
    );

  if (expiredOrders.length === 0) {
    return {
      success: true,
      releasedCount: 0,
      expiredOrderNumbers: [],
    };
  }

  const expiredOrderNumbers: string[] = [];

  for (const order of expiredOrders) {
    await db.transaction(async (tx) => {
      // Re-check order with FOR UPDATE to prevent race condition
      const checkRows = await tx.execute(
        sql`SELECT id, status, payment_status, pickup_date, pickup_slot_id 
            FROM orders 
            WHERE id = ${order.id} FOR UPDATE`
      );

      const currentOrder = checkRows.rows[0] as
        | { id: string; status: string; payment_status: string; pickup_date: string; pickup_slot_id: string }
        | undefined;

      // If order was confirmed/paid concurrently, skip it
      if (!currentOrder || currentOrder.status !== "PENDING" || currentOrder.payment_status === "PAID") {
        return;
      }

      // Calculate total cake items to restore capacity
      const itemRows = await tx
        .select({ quantity: schema.orderItems.quantity })
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, order.id));

      const cakeCount = itemRows.reduce((sum, item) => sum + item.quantity, 0);

      // Decrement capacity (clamped at 0 to satisfy check constraints)
      await tx.execute(
        sql`UPDATE daily_capacity 
            SET reserved_cakes = GREATEST(0, reserved_cakes - ${cakeCount}), updated_at = CURRENT_TIMESTAMP 
            WHERE bakery_date = ${currentOrder.pickup_date}`
      );

      // Decrement slot usage
      await tx.execute(
        sql`UPDATE pickup_slots 
            SET reserved_orders = GREATEST(0, reserved_orders - 1) 
            WHERE id = ${currentOrder.pickup_slot_id}`
      );

      // Mark order as EXPIRED
      await tx
        .update(schema.orders)
        .set({
          status: "EXPIRED",
          cancellationReason: "Hold expired after 10 minutes without payment.",
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, order.id));

      // Audit Log
      await tx.insert(schema.auditLogs).values({
        entityType: "ORDER",
        entityId: order.id,
        action: "HOLD_EXPIRED_RELEASED",
        details: {
          orderNumber: order.orderNumber,
          releasedCakes: cakeCount,
          pickupDate: currentOrder.pickup_date,
        },
      });

      expiredOrderNumbers.push(order.orderNumber);
    });
  }

  return {
    success: true,
    releasedCount: expiredOrderNumbers.length,
    expiredOrderNumbers,
  };
}
