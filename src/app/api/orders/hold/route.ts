import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createOrderHold } from "@/lib/transactions/orderHold";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required to reserve a pickup slot." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { pickupDate, pickupSlotId, items, referenceImageUrl, specialNotes } = body;

    if (!pickupDate || !pickupSlotId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Missing required order parameters: pickupDate, pickupSlotId, and items." },
        { status: 400 }
      );
    }

    const result = await createOrderHold({
      customerId: session.userId,
      pickupDate,
      pickupSlotId,
      items,
      referenceImageUrl,
      specialNotes,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      order: result.order,
      message: "Pickup slot and daily capacity reserved for 10 minutes.",
    });
  } catch (error) {
    console.error("Order hold error:", error);
    return NextResponse.json(
      { error: "Failed to reserve order hold." },
      { status: 500 }
    );
  }
}
