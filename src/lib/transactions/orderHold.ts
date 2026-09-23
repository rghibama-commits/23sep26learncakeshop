import { getDb, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

export interface CreateOrderHoldInput {
  customerId: string;
  pickupDate: string; // YYYY-MM-DD
  pickupSlotId: string;
  items: {
    productId: string;
    quantity: number;
    sizeOptionId?: string;
    flavourOptionId?: string;
    cakeMessage?: string;
  }[];
  referenceImageUrl?: string;
  specialNotes?: string;
  idempotencyKey?: string;
}

export interface CreateOrderHoldResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  order?: {
    id: string;
    orderNumber: string;
    expiresAt: Date;
    totalInCents: number;
    subtotalInCents: number;
    customisationFeeInCents: number;
    messageFeeInCents: number;
  };
}

export async function createOrderHold(input: CreateOrderHoldInput): Promise<CreateOrderHoldResult> {
  const db = await getDb();

  // 1. Validate Lead Time (Minimum 48 Hours)
  const now = new Date();
  const pickupDateTime = new Date(`${input.pickupDate}T10:00:00Z`); // early slot reference
  const hoursUntilPickup = (pickupDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilPickup < 48) {
    return {
      success: false,
      error: "Orders require a minimum 48-hour advance notice for preparation.",
      statusCode: 400,
    };
  }

  // 2. Validate Cart Items and Message Lengths
  if (!input.items || input.items.length === 0) {
    return {
      success: false,
      error: "Your cart is empty.",
      statusCode: 400,
    };
  }

  let totalCakesCount = 0;
  for (const item of input.items) {
    if (item.quantity <= 0) {
      return { success: false, error: "Quantity must be greater than zero.", statusCode: 400 };
    }
    totalCakesCount += item.quantity;

    if (item.cakeMessage && item.cakeMessage.length > 40) {
      return {
        success: false,
        error: `Custom message "${item.cakeMessage}" exceeds the 40 character limit.`,
        statusCode: 400,
      };
    }
  }

  // 3. Begin Transaction with Row Locking
  return await db.transaction(async (tx) => {
    // 3a. Lock Daily Capacity row with SELECT ... FOR UPDATE
    const capacityRows = await tx.execute(
      sql`SELECT id, max_cakes, reserved_cakes, is_closed FROM daily_capacity WHERE bakery_date = ${input.pickupDate} FOR UPDATE`
    );

    const capacityRow = capacityRows.rows[0] as
      | { id: string; max_cakes: number; reserved_cakes: number; is_closed: boolean }
      | undefined;

    if (!capacityRow) {
      return {
        success: false,
        error: `Bakery schedule is not available for date ${input.pickupDate}.`,
        statusCode: 404,
      };
    }

    if (capacityRow.is_closed) {
      return {
        success: false,
        error: `The bakery is closed on ${input.pickupDate}. Please select another date.`,
        statusCode: 400,
      };
    }

    const remainingCapacity = capacityRow.max_cakes - capacityRow.reserved_cakes;
    if (remainingCapacity < totalCakesCount) {
      return {
        success: false,
        error: `Only ${remainingCapacity} cake(s) remaining for ${input.pickupDate}. Cart requires ${totalCakesCount}.`,
        statusCode: 409,
      };
    }

    // 3b. Lock Pickup Slot row with SELECT ... FOR UPDATE
    const slotRows = await tx.execute(
      sql`SELECT id, max_orders, reserved_orders, is_active FROM pickup_slots WHERE id = ${input.pickupSlotId} FOR UPDATE`
    );

    const slotRow = slotRows.rows[0] as
      | { id: string; max_orders: number; reserved_orders: number; is_active: boolean }
      | undefined;

    if (!slotRow) {
      return {
        success: false,
        error: "Selected pickup time slot was not found.",
        statusCode: 404,
      };
    }

    if (!slotRow.is_active) {
      return {
        success: false,
        error: "Selected pickup time slot is currently unavailable.",
        statusCode: 400,
      };
    }

    if (slotRow.reserved_orders >= slotRow.max_orders) {
      return {
        success: false,
        error: "This pickup time slot is fully booked. Please choose an adjacent slot.",
        statusCode: 409,
      };
    }

    // 3c. Calculate Prices Server-Side (preventing client price manipulation)
    let subtotalInCents = 0;
    let customisationFeeInCents = 0;
    let messageFeeInCents = 0;

    interface PreparedItem {
      productId: string;
      quantity: number;
      unitPriceInCents: number;
      totalPriceInCents: number;
      cakeMessage?: string;
      customisations: {
        optionId?: string;
        optionType: string;
        optionName: string;
        priceDeltaInCents: number;
      }[];
    }

    const preparedItems: PreparedItem[] = [];

    for (const item of input.items) {
      // Fetch Product
      const [product] = await tx
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, item.productId));

      if (!product || !product.isActive) {
        return {
          success: false,
          error: `Product not found or currently unavailable.`,
          statusCode: 404,
        };
      }

      let itemUnitPrice = product.basePriceInCents;
      const customisationsList: PreparedItem["customisations"] = [];

      // Size Option Delta
      if (item.sizeOptionId) {
        const [sizeOpt] = await tx
          .select()
          .from(schema.productOptions)
          .where(eq(schema.productOptions.id, item.sizeOptionId));

        if (sizeOpt && sizeOpt.isAvailable) {
          itemUnitPrice += sizeOpt.priceDeltaInCents;
          customisationFeeInCents += sizeOpt.priceDeltaInCents * item.quantity;
          customisationsList.push({
            optionId: sizeOpt.id,
            optionType: "SIZE",
            optionName: sizeOpt.name,
            priceDeltaInCents: sizeOpt.priceDeltaInCents,
          });
        }
      }

      // Flavour Option Delta
      if (item.flavourOptionId) {
        const [flavourOpt] = await tx
          .select()
          .from(schema.productOptions)
          .where(eq(schema.productOptions.id, item.flavourOptionId));

        if (flavourOpt && flavourOpt.isAvailable) {
          itemUnitPrice += flavourOpt.priceDeltaInCents;
          customisationFeeInCents += flavourOpt.priceDeltaInCents * item.quantity;
          customisationsList.push({
            optionId: flavourOpt.id,
            optionType: "FLAVOUR",
            optionName: flavourOpt.name,
            priceDeltaInCents: flavourOpt.priceDeltaInCents,
          });
        }
      }

      // Custom message fee ($2.50 = 250 cents)
      if (item.cakeMessage && item.cakeMessage.trim().length > 0) {
        const feePerMessage = 250;
        messageFeeInCents += feePerMessage * item.quantity;
      }

      const itemTotal = itemUnitPrice * item.quantity;
      subtotalInCents += product.basePriceInCents * item.quantity;

      preparedItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPriceInCents: itemUnitPrice,
        totalPriceInCents: itemTotal,
        cakeMessage: item.cakeMessage?.trim() || undefined,
        customisations: customisationsList,
      });
    }

    const totalInCents = subtotalInCents + customisationFeeInCents + messageFeeInCents;

    // 3d. Increment Capacity and Slot Reservation
    await tx.execute(
      sql`UPDATE daily_capacity 
          SET reserved_cakes = reserved_cakes + ${totalCakesCount}, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ${capacityRow.id}`
    );

    await tx.execute(
      sql`UPDATE pickup_slots 
          SET reserved_orders = reserved_orders + 1 
          WHERE id = ${slotRow.id}`
    );

    // 3e. Generate Order Number & QR Token
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const orderNumber = `CC-${input.pickupDate.replace(/-/g, "").slice(2)}-${randomSuffix}`;
    const qrToken = crypto.randomBytes(24).toString("hex");

    // 10-Minute Hold Expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    // Cancellation Cutoff: 24 hours before pickup day at 00:00 UTC
    const cancelCutoff = new Date(pickupDateTime.getTime() - 24 * 60 * 60 * 1000);

    // 3f. Create Pending Order
    const [createdOrder] = await tx
      .insert(schema.orders)
      .values({
        orderNumber,
        customerId: input.customerId,
        pickupDate: input.pickupDate,
        pickupSlotId: input.pickupSlotId,
        status: "PENDING",
        paymentStatus: "HOLD_RESERVED",
        subtotalInCents,
        customisationFeeInCents,
        messageFeeInCents,
        totalInCents,
        expiresAt,
        cancelCutoff,
        pickupQrToken: qrToken,
        referenceImageUrl: input.referenceImageUrl,
        specialNotes: input.specialNotes,
      })
      .returning();

    // 3g. Insert Order Items and Customisations
    for (const pItem of preparedItems) {
      const [insertedItem] = await tx
        .insert(schema.orderItems)
        .values({
          orderId: createdOrder.id,
          productId: pItem.productId,
          quantity: pItem.quantity,
          unitPriceInCents: pItem.unitPriceInCents,
          totalPriceInCents: pItem.totalPriceInCents,
          cakeMessage: pItem.cakeMessage,
        })
        .returning();

      for (const custom of pItem.customisations) {
        await tx.insert(schema.orderCustomisations).values({
          orderItemId: insertedItem.id,
          optionId: custom.optionId,
          optionType: custom.optionType,
          optionName: custom.optionName,
          priceDeltaInCents: custom.priceDeltaInCents,
        });
      }
    }

    // 3h. Audit Log
    await tx.insert(schema.auditLogs).values({
      entityType: "ORDER",
      entityId: createdOrder.id,
      action: "HOLD_CREATED",
      performedBy: input.customerId,
      details: {
        orderNumber,
        totalCakesCount,
        pickupDate: input.pickupDate,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      success: true,
      order: {
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        expiresAt,
        totalInCents,
        subtotalInCents,
        customisationFeeInCents,
        messageFeeInCents,
      },
    };
  });
}
