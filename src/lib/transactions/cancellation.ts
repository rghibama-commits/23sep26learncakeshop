import { getDb, schema } from "@/db";
import { sql, eq } from "drizzle-orm";

export interface CancelOrderInput {
  orderId: string;
  userId: string;
  userRole: "CUSTOMER" | "BAKER" | "ADMIN";
  reason?: string;
}

export interface CancelOrderResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  orderNumber?: string;
}

export async function cancelOrder(input: CancelOrderInput): Promise<CancelOrderResult> {
  const db = await getDb();

  return await db.transaction(async (tx) => {
    // 1. Fetch Order with FOR UPDATE
    const orderRows = await tx.execute(
      sql`SELECT id, order_number, customer_id, pickup_date, pickup_slot_id, status, cancel_cutoff, total_in_cents 
          FROM orders 
          WHERE id = ${input.orderId} FOR UPDATE`
    );

    const order = orderRows.rows[0] as
      | {
          id: string;
          order_number: string;
          customer_id: string;
          pickup_date: string;
          pickup_slot_id: string;
          status: string;
          cancel_cutoff: string;
          total_in_cents: number;
        }
      | undefined;

    if (!order) {
      return { success: false, error: "Order not found.", statusCode: 404 };
    }

    // 2. Authorization Check (Customer can only cancel their own order; Baker can cancel any order)
    if (input.userRole === "CUSTOMER" && order.customer_id !== input.userId) {
      return { success: false, error: "You are not authorized to cancel this order.", statusCode: 403 };
    }

    // 3. Status Check
    if (order.status === "CANCELLED" || order.status === "REFUNDED" || order.status === "COLLECTED") {
      return {
        success: false,
        error: `Order cannot be cancelled because it is already ${order.status.toLowerCase()}.`,
        statusCode: 400,
      };
    }

    // 4. Enforce 24-Hour Cut-off Rule
    const now = new Date();
    const cutoffTime = new Date(order.cancel_cutoff);

    // If customer (non-baker), enforce strictly
    if (input.userRole === "CUSTOMER") {
      if (now > cutoffTime) {
        return {
          success: false,
          error: "Cancellation cut-off has passed. Orders cannot be cancelled less than 24 hours prior to pickup.",
          statusCode: 400,
        };
      }
    }

    // 5. Calculate Cakes to Restore
    const itemRows = await tx
      .select({ quantity: schema.orderItems.quantity })
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, order.id));

    const totalCakes = itemRows.reduce((sum, item) => sum + item.quantity, 0);

    // 6. Release Capacity and Slot
    await tx.execute(
      sql`UPDATE daily_capacity 
          SET reserved_cakes = GREATEST(0, reserved_cakes - ${totalCakes}), updated_at = CURRENT_TIMESTAMP 
          WHERE bakery_date = ${order.pickup_date}`
    );

    await tx.execute(
      sql`UPDATE pickup_slots 
          SET reserved_orders = GREATEST(0, reserved_orders - 1) 
          WHERE id = ${order.pickup_slot_id}`
    );

    // 7. Update Order Status
    await tx
      .update(schema.orders)
      .set({
        status: "CANCELLED",
        cancelledAt: now,
        cancellationReason: input.reason || "Customer requested cancellation before cutoff.",
        updatedAt: now,
      })
      .where(eq(schema.orders.id, order.id));

    // 8. Audit Log
    await tx.insert(schema.auditLogs).values({
      entityType: "ORDER",
      entityId: order.id,
      action: "ORDER_CANCELLED",
      performedBy: input.userId,
      details: {
        orderNumber: order.order_number,
        releasedCakes: totalCakes,
        reason: input.reason || "Cancelled before 24h cutoff",
      },
    });

    return {
      success: true,
      orderNumber: order.order_number,
    };
  });
}
