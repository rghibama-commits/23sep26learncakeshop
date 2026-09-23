import { getDb, schema } from "@/db";
import { sql, eq } from "drizzle-orm";

export interface ConfirmOrderInput {
  orderId: string;
  idempotencyKey: string;
  providerPaymentId?: string;
  provider?: string;
}

export interface ConfirmOrderResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  orderNumber?: string;
  isDuplicate?: boolean;
}

export async function confirmOrderPayment(input: ConfirmOrderInput): Promise<ConfirmOrderResult> {
  const db = await getDb();

  return await db.transaction(async (tx) => {
    // 1. Check Idempotency Key
    const [existingPayment] = await tx
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.idempotencyKey, input.idempotencyKey));

    if (existingPayment) {
      // Payment already processed with this key
      const [existingOrder] = await tx
        .select({ orderNumber: schema.orders.orderNumber })
        .from(schema.orders)
        .where(eq(schema.orders.id, existingPayment.orderId));

      return {
        success: true,
        isDuplicate: true,
        orderNumber: existingOrder?.orderNumber,
      };
    }

    // 2. Lock Order row
    const orderRows = await tx.execute(
      sql`SELECT id, order_number, customer_id, status, payment_status, total_in_cents, expires_at 
          FROM orders 
          WHERE id = ${input.orderId} FOR UPDATE`
    );

    const order = orderRows.rows[0] as
      | {
          id: string;
          order_number: string;
          customer_id: string;
          status: string;
          payment_status: string;
          total_in_cents: number;
          expires_at: string | null;
        }
      | undefined;

    if (!order) {
      return { success: false, error: "Order not found.", statusCode: 404 };
    }

    if (order.status === "EXPIRED") {
      return {
        success: false,
        error: "Reservation hold expired. Please re-select your items.",
        statusCode: 410,
      };
    }

    if (order.status === "CANCELLED") {
      return {
        success: false,
        error: "Order was cancelled.",
        statusCode: 400,
      };
    }

    const now = new Date();

    // 3. Insert Payment Record with Idempotency Key
    await tx.insert(schema.payments).values({
      orderId: order.id,
      idempotencyKey: input.idempotencyKey,
      provider: input.provider || "STRIPE_TEST",
      providerPaymentId: input.providerPaymentId || `ch_test_${Date.now()}`,
      amountInCents: order.total_in_cents,
      status: "SUCCEEDED",
      rawResponse: { confirmedAt: now.toISOString(), mode: "test" },
    });

    // 4. Transition Order to CONFIRMED and paymentStatus to PAID
    await tx
      .update(schema.orders)
      .set({
        status: "CONFIRMED",
        paymentStatus: "PAID",
        expiresAt: null, // Hold is permanently secured
        updatedAt: now,
      })
      .where(eq(schema.orders.id, order.id));

    // 5. Audit Log
    await tx.insert(schema.auditLogs).values({
      entityType: "ORDER",
      entityId: order.id,
      action: "ORDER_CONFIRMED",
      performedBy: order.customer_id,
      details: {
        orderNumber: order.order_number,
        amountInCents: order.total_in_cents,
        idempotencyKey: input.idempotencyKey,
      },
    });

    return {
      success: true,
      orderNumber: order.order_number,
      isDuplicate: false,
    };
  });
}
