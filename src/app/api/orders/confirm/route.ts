import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { confirmOrderPayment } from "@/lib/transactions/orderConfirmation";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, idempotencyKey, providerPaymentId, provider } = body;

    if (!orderId || !idempotencyKey) {
      return NextResponse.json(
        { error: "orderId and idempotencyKey are required." },
        { status: 400 }
      );
    }

    const result = await confirmOrderPayment({
      orderId,
      idempotencyKey,
      providerPaymentId,
      provider: provider || "STRIPE_TEST",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      orderNumber: result.orderNumber,
      isDuplicate: result.isDuplicate,
      message: result.isDuplicate
        ? "Payment already processed previously (Idempotent)."
        : "Order confirmed successfully! Bakery preparation scheduled.",
    });
  } catch (error) {
    console.error("Order confirmation error:", error);
    return NextResponse.json(
      { error: "Failed to confirm order." },
      { status: 500 }
    );
  }
}
