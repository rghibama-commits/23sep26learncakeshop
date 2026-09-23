import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cancelOrder } from "@/lib/transactions/cancellation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason;

    const result = await cancelOrder({
      orderId: id,
      userId: session.userId,
      userRole: session.role,
      reason,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Order ${result.orderNumber} has been successfully cancelled and bakery capacity released.`,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json(
      { error: "Failed to process cancellation." },
      { status: 500 }
    );
  }
}
