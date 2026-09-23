"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, formatDatePretty } from "@/lib/format";
import {
  ShieldCheck,
  Calendar,
  Clock,
  CheckCircle2,
  ChefHat,
  ShoppingBag,
  Sliders,
  Power,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  Eye,
} from "lucide-react";

interface BakerOrder {
  id: string;
  orderNumber: string;
  pickupDate: string;
  status: string;
  paymentStatus: string;
  totalInCents: number;
  specialNotes?: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
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
    };
    customisations: {
      optionType: string;
      optionName: string;
    }[];
  }[];
}

interface CapacityDay {
  id: string;
  bakeryDate: string;
  maxCakes: number;
  reservedCakes: number;
  isClosed: boolean;
}

export default function BakerDashboardPage() {
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<BakerOrder[]>([]);
  const [capacities, setCapacities] = useState<CapacityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Capacity update modal/state
  const [editCapDay, setEditCapDay] = useState<CapacityDay | null>(null);
  const [newMaxCakes, setNewMaxCakes] = useState<number>(12);
  const [savingCap, setSavingCap] = useState(false);

  const fetchBakerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const ordersParams = new URLSearchParams();
      if (selectedDate !== "all") ordersParams.set("date", selectedDate);
      if (statusFilter !== "all") ordersParams.set("status", statusFilter);

      const [ordersRes, capsRes] = await Promise.all([
        fetch(`/api/baker/orders?${ordersParams.toString()}`),
        fetch("/api/baker/capacity"),
      ]);

      const ordersData = await ordersRes.json();
      const capsData = await capsRes.json();

      if (ordersRes.ok && capsRes.ok) {
        setOrders(ordersData.orders || []);
        setCapacities(capsData.capacities || []);
      } else {
        setError(ordersData.error || capsData.error || "Failed to load baker data");
      }
    } catch {
      setError("Network error fetching baker studio data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && (user.role === "BAKER" || user.role === "ADMIN")) {
      fetchBakerData();
    }
  }, [user, authLoading, selectedDate, statusFilter]);

  const updateOrderStatus = async (orderId: string, nextStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/baker/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        // Refresh orders list
        fetchBakerData();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch {
      alert("Network error updating status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleCloseDate = async (cap: CapacityDay) => {
    try {
      const res = await fetch("/api/baker/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bakeryDate: cap.bakeryDate,
          isClosed: !cap.isClosed,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchBakerData();
      } else {
        alert(data.error || "Failed to update date status");
      }
    } catch {
      alert("Network error updating date status");
    }
  };

  const handleSaveMaxCakes = async () => {
    if (!editCapDay) return;
    setSavingCap(true);
    try {
      const res = await fetch("/api/baker/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bakeryDate: editCapDay.bakeryDate,
          maxCakes: newMaxCakes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditCapDay(null);
        fetchBakerData();
      } else {
        alert(data.error || "Failed to update capacity limit");
      }
    } catch {
      alert("Network error updating capacity limit");
    } finally {
      setSavingCap(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 mx-auto border-3 border-amber-700 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-stone-600 font-medium">Checking baker studio credentials...</p>
      </div>
    );
  }

  // Role Gate
  if (!user || (user.role !== "BAKER" && user.role !== "ADMIN")) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <ShieldCheck className="w-12 h-12 text-rose-600 mx-auto" />
        <h2 className="font-serif text-2xl font-bold text-stone-900">Baker Access Required</h2>
        <p className="text-stone-600 text-sm">
          This portal is reserved for CakeCart bakery staff. Please log in with a baker credential.
        </p>
        <Link
          href="/login?redirect=/baker"
          className="inline-block px-6 py-2.5 bg-amber-700 text-white rounded-xl text-xs font-semibold"
        >
          Sign In as Baker
        </Link>
      </div>
    );
  }

  // Metrics
  const totalRevenueCents = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + o.totalInCents, 0);
  const bakingCount = orders.filter((o) => o.status === "BAKING").length;
  const readyCount = orders.filter((o) => o.status === "READY").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
            <ChefHat className="w-4 h-4" />
            <span>Pastry Chef Operations Console</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 mt-1">
            Baker Studio Dashboard
          </h1>
        </div>

        <button
          onClick={fetchBakerData}
          className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Orders
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold uppercase text-stone-400">Scheduled Orders</div>
          <div className="font-serif text-3xl font-bold text-stone-900">{orders.length}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold uppercase text-stone-400">In Oven / Baking</div>
          <div className="font-serif text-3xl font-bold text-blue-700">{bakingCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold uppercase text-stone-400">Ready for Collection</div>
          <div className="font-serif text-3xl font-bold text-emerald-700">{readyCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold uppercase text-stone-400">Total Booked Volume</div>
          <div className="font-serif text-3xl font-bold text-amber-900">
            {formatPrice(totalRevenueCents)}
          </div>
        </div>
      </div>

      {/* Daily Capacity & Date Management Bar */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
        <h2 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-700" />
          Daily Capacity & Bakery Date Schedule
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 overflow-x-auto pb-2">
          {capacities.slice(0, 14).map((cap) => (
            <div
              key={cap.id}
              className={`p-3 rounded-xl border flex flex-col justify-between text-xs transition-all ${
                cap.isClosed
                  ? "bg-stone-50 border-stone-300 opacity-60"
                  : selectedDate === cap.bakeryDate
                  ? "bg-amber-50 border-amber-600 ring-2 ring-amber-600/20"
                  : "bg-white border-stone-200"
              }`}
            >
              <div>
                <div className="font-bold text-stone-900">
                  {new Date(cap.bakeryDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "numeric",
                    day: "numeric",
                  })}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  <strong>{cap.reservedCakes}</strong> / {cap.maxCakes} booked
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1 mt-2">
                <button
                  onClick={() => {
                    setEditCapDay(cap);
                    setNewMaxCakes(cap.maxCakes);
                  }}
                  title="Adjust Capacity Limit"
                  className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-semibold"
                >
                  Edit Cap
                </button>
                <button
                  onClick={() => handleToggleCloseDate(cap)}
                  title={cap.isClosed ? "Open Date" : "Close Date"}
                  className={`px-2 py-1 rounded text-[10px] font-semibold ${
                    cap.isClosed
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                  }`}
                >
                  {cap.isClosed ? "Open" : "Close"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Orders Management */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 pb-4">
          <h2 className="font-serif text-xl font-bold text-stone-900">
            Order Queue & Status Transitions
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Filter by date */}
            <div>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-amber-700 font-medium"
              >
                <option value="all">All Pickup Days</option>
                {capacities.map((c) => (
                  <option key={c.id} value={c.bakeryDate}>
                    {c.bakeryDate}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by status */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-amber-700 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="BAKING">BAKING</option>
                <option value="READY">READY</option>
                <option value="COLLECTED">COLLECTED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table / List */}
        {orders.length === 0 ? (
          <div className="text-center py-16 text-stone-400 space-y-2">
            <ShoppingBag className="w-10 h-10 mx-auto" />
            <p className="text-sm">No orders matching the selected date or status filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="p-5 rounded-2xl border border-stone-200 hover:border-amber-300 transition-colors flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-base font-bold text-stone-900">
                      #{ord.orderNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        ord.status === "CONFIRMED"
                          ? "bg-amber-100 text-amber-800"
                          : ord.status === "BAKING"
                          ? "bg-blue-100 text-blue-800"
                          : ord.status === "READY"
                          ? "bg-emerald-100 text-emerald-800"
                          : ord.status === "COLLECTED"
                          ? "bg-stone-100 text-stone-700"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {ord.status}
                    </span>
                    <span className="text-xs text-stone-500">
                      Customer: <strong>{ord.customer?.name}</strong> ({ord.customer?.phone || ord.customer?.email})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-stone-600">
                    <div className="flex items-center gap-1 font-semibold text-amber-900">
                      <Calendar className="w-3.5 h-3.5 text-amber-700" />
                      Pickup: {formatDatePretty(ord.pickupDate)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      Slot: {ord.pickupSlot?.startTime} – {ord.pickupSlot?.endTime}
                    </div>
                    <div>Total: {formatPrice(ord.totalInCents)}</div>
                  </div>

                  {/* Items and Custom messages */}
                  <div className="pt-1 space-y-1">
                    {ord.items.map((item) => (
                      <div key={item.id} className="text-xs text-stone-800">
                        • <strong>{item.quantity}x {item.product.name}</strong>
                        {item.customisations.length > 0 && (
                          <span className="text-stone-500 ml-1">
                            ({item.customisations.map((c) => c.optionName).join(", ")})
                          </span>
                        )}
                        {item.cakeMessage && (
                          <span className="bg-amber-50 text-amber-900 font-semibold px-2 py-0.5 rounded ml-2 border border-amber-200">
                            Plaque: &ldquo;{item.cakeMessage}&rdquo;
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {ord.specialNotes && (
                    <div className="text-[11px] text-stone-500 italic bg-stone-50 p-2 rounded-lg">
                      Customer Note: {ord.specialNotes}
                    </div>
                  )}
                </div>

                {/* Status Transition Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {ord.status === "CONFIRMED" && (
                    <button
                      disabled={updatingId === ord.id}
                      onClick={() => updateOrderStatus(ord.id, "BAKING")}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                      {updatingId === ord.id ? "Updating..." : "Mark as BAKING"}
                    </button>
                  )}

                  {ord.status === "BAKING" && (
                    <button
                      disabled={updatingId === ord.id}
                      onClick={() => updateOrderStatus(ord.id, "READY")}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                      {updatingId === ord.id ? "Updating..." : "Mark as READY"}
                    </button>
                  )}

                  {ord.status === "READY" && (
                    <button
                      disabled={updatingId === ord.id}
                      onClick={() => updateOrderStatus(ord.id, "COLLECTED")}
                      className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                      {updatingId === ord.id ? "Updating..." : "Mark as COLLECTED"}
                    </button>
                  )}

                  <Link
                    href={`/order-confirmation/${ord.orderNumber}`}
                    className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs"
                    title="View QR Code & Public Pass"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Capacity Edit Modal */}
      {editCapDay && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Set Max Daily Capacity
            </h3>
            <p className="text-xs text-stone-600">
              Adjust maximum total cakes bakeable on{" "}
              <strong>{formatDatePretty(editCapDay.bakeryDate)}</strong>.
            </p>
            <div className="text-xs text-stone-500">
              Current reservations on this date: <strong>{editCapDay.reservedCakes}</strong> cakes.
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Max Cakes Limit
              </label>
              <input
                type="number"
                min={editCapDay.reservedCakes}
                max={50}
                value={newMaxCakes}
                onChange={(e) => setNewMaxCakes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-1 focus:ring-amber-700"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditCapDay(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={savingCap}
                onClick={handleSaveMaxCakes}
                className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold"
              >
                {savingCap ? "Saving..." : "Save Limit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
