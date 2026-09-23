"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, formatDatePretty, formatDateTime } from "@/lib/format";
import {
  Calendar,
  Clock,
  QrCode,
  AlertCircle,
  PackageCheck,
  ChevronRight,
  XCircle,
} from "lucide-react";

interface CustomerOrder {
  id: string;
  orderNumber: string;
  pickupDate: string;
  status: string;
  paymentStatus: string;
  totalInCents: number;
  cancelCutoff: string;
  createdAt: string;
  pickupSlot: {
    startTime: string;
    endTime: string;
  };
  items: {
    id: string;
    quantity: number;
    cakeMessage?: string;
    product: {
      name: string;
      imageUrl: string;
    };
  }[];
}

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders/my-orders");
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      } else {
        setError(data.error || "Failed to load orders");
      }
    } catch {
      setError("Network error fetching orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (user) fetchOrders();
      else setLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 mx-auto border-3 border-amber-700 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-stone-600 font-medium">Loading your bakery orders...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <PackageCheck className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="font-serif text-2xl font-bold text-stone-900">Sign in to View Orders</h2>
        <p className="text-stone-600 text-sm">
          Please log in with your customer account to view your scheduled pickups and collection QR codes.
        </p>
        <Link
          href="/login?redirect=/orders"
          className="inline-block px-6 py-3 bg-amber-700 text-white rounded-xl text-sm font-semibold hover:bg-amber-800"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
          My Bakery Orders
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Track baking progress, access collection QR passes, and view schedule details.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-4">
          <PackageCheck className="w-12 h-12 text-amber-700/60 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-stone-900">No Orders Yet</h3>
          <p className="text-stone-500 text-sm max-w-sm mx-auto">
            You haven&apos;t scheduled any cake pickups yet. Browse our artisan catalog to book a slot.
          </p>
          <Link
            href="/menu"
            className="inline-block px-6 py-3 bg-amber-700 text-white rounded-xl text-sm font-semibold hover:bg-amber-800"
          >
            Explore Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((ord) => {
            const now = new Date();
            const cutoffTime = new Date(ord.cancelCutoff);
            const canCancel = ord.status !== "CANCELLED" && ord.status !== "COLLECTED" && now < cutoffTime;

            return (
              <div
                key={ord.id}
                className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6 hover:border-amber-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-100 pb-4">
                  <div>
                    <span className="text-[11px] font-mono text-stone-400 font-semibold block">
                      Order Placed {formatDateTime(ord.createdAt)}
                    </span>
                    <span className="font-mono text-xl font-bold text-stone-900">
                      #{ord.orderNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        ord.status === "CONFIRMED"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : ord.status === "BAKING"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : ord.status === "READY"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : ord.status === "COLLECTED"
                          ? "bg-stone-100 text-stone-700 border border-stone-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                    <div className="text-stone-400 font-semibold uppercase flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-700" />
                      Collection Date
                    </div>
                    <div className="font-bold text-stone-900 text-sm">
                      {formatDatePretty(ord.pickupDate)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                    <div className="text-stone-400 font-semibold uppercase flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      Pickup Window
                    </div>
                    <div className="font-bold text-stone-900 text-sm">
                      {ord.pickupSlot?.startTime} – {ord.pickupSlot?.endTime}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                    <div className="text-stone-400 font-semibold uppercase">Total Amount</div>
                    <div className="font-serif text-lg font-bold text-amber-900">
                      {formatPrice(ord.totalInCents)}
                    </div>
                  </div>
                </div>

                {/* Items in order */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-stone-700 block">Items:</span>
                  <div className="flex flex-wrap gap-2">
                    {ord.items.map((item) => (
                      <span
                        key={item.id}
                        className="px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-xs text-stone-800"
                      >
                        <strong>{item.quantity}x</strong> {item.product.name}
                        {item.cakeMessage && (
                          <span className="text-amber-800 italic ml-1">
                            (&ldquo;{item.cakeMessage}&rdquo;)
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="text-[11px] text-stone-500">
                    {canCancel ? (
                      <span>
                        Cancellation eligible until <strong>{formatDateTime(ord.cancelCutoff)}</strong>
                      </span>
                    ) : ord.status === "CANCELLED" ? (
                      <span className="text-rose-600 font-medium">Order Cancelled</span>
                    ) : (
                      <span>Cancellation cut-off has passed (less than 24h before pickup).</span>
                    )}
                  </div>

                  <Link
                    href={`/order-confirmation/${ord.orderNumber}`}
                    className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>View QR Pass & Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
