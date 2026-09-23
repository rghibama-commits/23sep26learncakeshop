import { NextRequest, NextResponse } from "next/server";
import { confirmOrderPayment } from "@/lib/transactions/orderConfirmation";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    if (webhookSecret && signature) {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
        apiVersion: "2024-06-20" as any,
      });

      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
      }
    } else {
      // Direct JSON payload in test/simulation mode
      try {
        event = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;
      const idempotencyKey = `wh_stripe_${paymentIntent.id}`;

      if (orderId) {
        const result = await confirmOrderPayment({
          orderId,
          idempotencyKey,
          providerPaymentId: paymentIntent.id,
          provider: "STRIPE_TEST",
        });

        return NextResponse.json({
          received: true,
          processed: result.success,
          isDuplicate: result.isDuplicate,
        });
      }
    }

    return NextResponse.json({ received: true, unhandledType: event.type });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
