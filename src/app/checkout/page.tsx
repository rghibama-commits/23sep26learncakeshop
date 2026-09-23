"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, formatDatePretty } from "@/lib/format";
import {
  CreditCard,
  Lock,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    items,
    holdOrder,
    pickupDate,
    pickupSlotTime,
    subtotalInCents,
    customisationFeeInCents,
    messageFeeInCents,
    totalInCents,
    clearCart,
  } = useCart();

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulated card form fields (in test mode)
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("123");
  const [cardholderName, setCardholderName] = useState(user?.name || "Elena Rostova");

  // 10-Minute Countdown Timer
  useEffect(() => {
    if (!holdOrder?.expiresAt) return;

    const expiryTime = new Date(holdOrder.expiresAt).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diffInSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeLeft(diffInSeconds);

      if (diffInSeconds <= 0) {
        setIsExpired(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [holdOrder?.expiresAt]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdOrder) {
      setError("No active hold reservation found. Please return to cart.");
      return;
    }

    if (isExpired) {
      setError("Your 10-minute hold reservation has expired. Please return to cart to re-reserve.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Generate client idempotency key
      const idempotencyKey = `pay_client_${holdOrder.id}_${Date.now()}`;

      const res = await fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: holdOrder.id,
          idempotencyKey,
          providerPaymentId: `ch_test_${Math.random().toString(36).substring(2, 10)}`,
          provider: "STRIPE_TEST",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Payment processing failed.");
        setProcessing(false);
        return;
      }

      // Success: clear cart and redirect to confirmation
      const orderNum = data.orderNumber || holdOrder.orderNumber;
      clearCart();
      router.push(`/order-confirmation/${orderNum}`);
    } catch {
      setError("Network error while completing payment.");
      setProcessing(false);
    }
  };

  if (!holdOrder) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-stone-900">No Active Reservation Found</h2>
        <p className="text-stone-600 text-sm">
          Please select your customized cakes and collection window from your cart first.
        </p>
        <Link href="/cart" className="inline-block px-6 py-3 bg-amber-700 text-white rounded-xl text-sm font-semibold">
          Return to Cart
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-800 mb-1">
          <Lock className="w-3.5 h-3.5" />
          <span>Secure Encrypted Checkout</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
          Complete Your Order
        </h1>
      </div>

      {/* 10-Minute Hold Expiry Banner */}
      <div
        className={`mb-8 p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
          isExpired
            ? "bg-red-50 border-red-200 text-red-900"
            : (timeLeft || 600) < 120
            ? "bg-orange-50 border-orange-200 text-orange-900"
            : "bg-amber-50/90 border-amber-200 text-amber-900"
        }`}
      >
        <div className="flex items-center gap-3">
          {isExpired ? (
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
          ) : (
            <Clock className="w-6 h-6 text-amber-700 shrink-0 animate-pulse" />
          )}
          <div>
            <div className="font-bold text-sm">
              {isExpired
                ? "Reservation Hold Expired"
                : `Slot Held for Order #${holdOrder.orderNumber}`}
            </div>
            <div className="text-xs opacity-80">
              {isExpired
                ? "Your 10-minute hold has elapsed and capacity was released back to the bakery schedule."
                : "Your pickup slot and oven capacity are locked exclusively for you."}
            </div>
          </div>
        </div>

        {!isExpired && timeLeft !== null && (
          <div className="font-mono text-2xl font-bold px-4 py-2 rounded-xl bg-white/90 border border-current/20 shadow-sm">
            {formatTimer(timeLeft)}
          </div>
        )}

        {isExpired && (
          <Link
            href="/cart"
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700"
          >
            Re-select Pickup Slot
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Payment Form (Test Mode Provider) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleProcessPayment} className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <h2 className="font-serif text-xl font-bold text-stone-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-700" />
                Payment Method
              </h2>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                Test Mode Active
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 leading-relaxed">
              <strong>Simulated Payment Gateway:</strong> For review and testing, pre-configured test credentials are populated below. No real card will be charged.
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-stone-700 font-semibold mb-1 text-xs">Cardholder Name</label>
                <input
                  type="text"
                  required
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1 text-xs">Card Number</label>
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1 text-xs">Expiry Date</label>
                  <input
                    type="text"
                    required
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1 text-xs">CVC</label>
                  <input
                    type="text"
                    required
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={processing || isExpired}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-base shadow-md transition-all flex items-center justify-center gap-2 ${
                processing || isExpired
                  ? "bg-stone-300 text-stone-500 cursor-not-allowed"
                  : "bg-amber-700 hover:bg-amber-800 text-white hover:shadow-lg"
              }`}
            >
              {processing ? (
                <span>Confirming Order with Bakery...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay {formatPrice(holdOrder.totalInCents || totalInCents)} & Confirm</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-stone-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>TLS 256-bit encryption • Payment secrets never exposed to browser</span>
            </div>
          </form>
        </div>

        {/* Right: Order Summary Preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm space-y-6">
            <h3 className="font-serif text-xl font-bold text-stone-900 border-b border-stone-100 pb-3">
              Order Summary
            </h3>

            {pickupDate && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-stone-800">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Pickup: {formatDatePretty(pickupDate)}</span>
                </div>
                {pickupSlotTime && (
                  <div className="text-amber-800 font-medium pl-5">
                    Window: {pickupSlotTime}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 text-sm text-stone-600">
              <div className="flex justify-between">
                <span>Base Cake Subtotal:</span>
                <span>{formatPrice(holdOrder.subtotalInCents || subtotalInCents)}</span>
              </div>
              {(holdOrder.customisationFeeInCents || customisationFeeInCents) > 0 && (
                <div className="flex justify-between">
                  <span>Customisations:</span>
                  <span>+{formatPrice(holdOrder.customisationFeeInCents || customisationFeeInCents)}</span>
                </div>
              )}
              {(holdOrder.messageFeeInCents || messageFeeInCents) > 0 && (
                <div className="flex justify-between text-amber-900">
                  <span>Piped Message Fee:</span>
                  <span>+{formatPrice(holdOrder.messageFeeInCents || messageFeeInCents)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-stone-100 flex justify-between items-baseline font-bold text-stone-900">
                <span>Total:</span>
                <span className="font-serif text-2xl text-amber-800">
                  {formatPrice(holdOrder.totalInCents || totalInCents)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
