"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { formatPrice, formatDatePretty, formatDateTime } from "@/lib/format";
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  QrCode as QrIcon,
  AlertCircle,
  XCircle,
  ArrowRight,
  Printer,
} from "lucide-react";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  pickupDate: string;
  cancelCutoff: string;
  pickupQrToken: string;
  totalInCents: number;
  subtotalInCents: number;
  customisationFeeInCents: number;
  messageFeeInCents: number;
  specialNotes?: string;
  pickupSlot: {
    startTime: string;
    endTime: string;
  };
  items: {
    id: string;
    quantity: number;
    unitPriceInCents: number;
    cakeMessage?: string;
    product: {
      name: string;
      imageUrl: string;
    };
    customisations: {
      optionType: string;
      optionName: string;
      priceDeltaInCents: number;
    }[];
  }[];
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderNumber = params?.orderNumber as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderNumber}`);
      const data = await res.json();
      if (res.ok && data.order) {
        setOrder(data.order);
        // Generate QR code with pickup token and order number
        const qrPayload = JSON.stringify({
          orderNumber: data.order.orderNumber,
          pickupQrToken: data.order.pickupQrToken,
          pickupDate: data.order.pickupDate,
        });
        const qrUrl = await QRCode.toDataURL(qrPayload, {
          width: 256,
          margin: 2,
          color: { dark: "#231610", light: "#ffffff" },
        });
        setQrCodeDataUrl(qrUrl);
      } else {
        setError(data.error || "Order not found");
      }
    } catch {
      setError("Network error fetching order details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderNumber) fetchOrder();
  }, [orderNumber]);

  const handleCancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || "Customer cancelled online" }),
      });
      const data = await res.json();
      if (res.ok) {
        setCancelModalOpen(false);
        fetchOrder();
      } else {
        alert(data.error || "Failed to cancel order");
      }
    } catch {
      alert("Network error cancelling order");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 mx-auto border-3 border-amber-700 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-stone-600 font-medium">Generating your collection pass and QR code...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="font-serif text-2xl font-bold text-stone-900">Order Not Found</h2>
        <p className="text-stone-600 text-sm">{error || "Could not retrieve order details."}</p>
        <Link href="/menu" className="inline-block px-6 py-2.5 bg-amber-700 text-white rounded-xl text-sm font-semibold">
          Return to Menu
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === "CANCELLED";
  const now = new Date();
  const cutoffTime = new Date(order.cancelCutoff);
  const isEligibleToCancel = !isCancelled && order.status !== "COLLECTED" && now < cutoffTime;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header status */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
          {isCancelled ? (
            <XCircle className="w-8 h-8 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-8 h-8" />
          )}
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
          {isCancelled ? "Order Cancelled" : "Baking Scheduled & Confirmed!"}
        </h1>
        <p className="text-stone-600 text-sm max-w-lg mx-auto">
          {isCancelled
            ? `Order #${order.orderNumber} has been cancelled and oven capacity returned to the bakery schedule.`
            : `Thank you! Order #${order.orderNumber} has been received. Please present your QR collection pass upon pickup.`}
        </p>
      </div>

      {/* Main Collection Pass Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-md overflow-hidden">
        <div className="bg-stone-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold block">
              Official Collection Pass
            </span>
            <div className="font-mono text-2xl font-bold mt-0.5">#{order.orderNumber}</div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                order.status === "CONFIRMED"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                  : order.status === "BAKING"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-400/30"
                  : order.status === "READY"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                  : order.status === "COLLECTED"
                  ? "bg-stone-700 text-stone-300"
                  : "bg-red-500/20 text-red-300"
              }`}
            >
              {order.status}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              {order.paymentStatus}
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* QR Code */}
          <div className="md:col-span-5 text-center flex flex-col items-center justify-center p-6 rounded-2xl bg-stone-50 border border-stone-200">
            {qrCodeDataUrl ? (
              <div className="relative w-48 h-48 bg-white p-2 rounded-xl shadow-sm border border-stone-200">
                <Image src={qrCodeDataUrl} alt="Pickup QR Code" fill className="object-contain p-1" />
              </div>
            ) : (
              <QrIcon className="w-40 h-40 text-stone-400 animate-pulse" />
            )}
            <div className="mt-3 text-xs font-semibold text-stone-700">
              Scan at Studio Pickup Counter
            </div>
            <div className="text-[10px] text-stone-400 font-mono mt-0.5">
              Token: {order.pickupQrToken.slice(0, 16)}...
            </div>
          </div>

          {/* Pickup Details */}
          <div className="md:col-span-7 space-y-5">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-stone-400 uppercase font-semibold">Collection Date</div>
                  <div className="text-base font-bold text-stone-900">
                    {formatDatePretty(order.pickupDate)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-stone-400 uppercase font-semibold">2-Hour Window</div>
                  <div className="text-base font-bold text-stone-900">
                    {order.pickupSlot.startTime} – {order.pickupSlot.endTime}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-stone-400 uppercase font-semibold">Bakery Location</div>
                  <div className="text-sm font-medium text-stone-800">
                    CakeCart Studio • 742 Patisserie Walk, Suite B, San Francisco, CA
                  </div>
                </div>
              </div>
            </div>

            {/* Cancellation Cut-off Notice */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 leading-relaxed">
              <strong>Bakery Cancellation Cut-Off:</strong> Cancellations are permitted until{" "}
              <strong>{formatDateTime(order.cancelCutoff)}</strong> (24 hours prior to collection).
            </div>
          </div>
        </div>

        {/* Ordered items breakdown */}
        <div className="p-6 sm:p-8 border-t border-stone-100 bg-stone-50/50 space-y-4">
          <h3 className="font-serif text-base font-bold text-stone-900">Items Prepared</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-semibold text-stone-900">
                    {item.quantity}x {item.product.name}
                  </span>
                  {item.customisations.length > 0 && (
                    <div className="text-xs text-stone-500">
                      {item.customisations.map((c) => c.optionName).join(" • ")}
                    </div>
                  )}
                  {item.cakeMessage && (
                    <div className="text-xs text-amber-800 font-medium">
                      Plaque: &ldquo;{item.cakeMessage}&rdquo;
                    </div>
                  )}
                </div>
                <div className="font-bold text-stone-800">
                  {formatPrice(item.unitPriceInCents * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-stone-200 flex justify-between items-baseline font-bold text-stone-900">
            <span>Total Paid (Test Mode):</span>
            <span className="font-serif text-2xl text-amber-900">
              {formatPrice(order.totalInCents)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Pass
          </button>
          <Link
            href="/orders"
            className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold"
          >
            View All My Orders
          </Link>
        </div>

        {isEligibleToCancel && (
          <button
            onClick={() => setCancelModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-semibold transition-colors"
          >
            Cancel Order (Before 24h Cut-off)
          </button>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Cancel Order #{order.orderNumber}?
            </h3>
            <p className="text-stone-600 text-xs leading-relaxed">
              Cancelling will release your pickup slot and daily capacity back to other customers. This action cannot be undone.
            </p>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Reason for cancellation
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Event rescheduled"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-700"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold"
              >
                Keep Order
              </button>
              <button
                disabled={cancelling}
                onClick={handleCancelOrder}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                {cancelling ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
