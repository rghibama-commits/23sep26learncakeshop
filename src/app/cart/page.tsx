"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { DatePickerSlotPicker } from "@/components/checkout/DatePickerSlotPicker";
import { formatPrice, formatDatePretty } from "@/lib/format";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  Calendar,
  Clock,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    items,
    pickupDate,
    pickupSlotId,
    pickupSlotTime,
    removeItem,
    updateQuantity,
    subtotalInCents,
    customisationFeeInCents,
    messageFeeInCents,
    totalInCents,
    totalCakesCount,
    setHoldOrder,
    specialNotes,
    setSpecialNotes,
  } = useCart();

  const [reservingHold, setReservingHold] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleProceedToCheckout = async () => {
    setErrorMessage(null);

    if (!user) {
      router.push("/login?redirect=/cart");
      return;
    }

    if (!pickupDate || !pickupSlotId) {
      setErrorMessage("Please select an available collection date and 2-hour pickup slot below.");
      return;
    }

    setReservingHold(true);

    try {
      const payload = {
        pickupDate,
        pickupSlotId,
        specialNotes,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          sizeOptionId: item.sizeOption?.id,
          flavourOptionId: item.flavourOption?.id,
          cakeMessage: item.cakeMessage,
        })),
        referenceImageUrl: items.find((i) => i.referenceImageUrl)?.referenceImageUrl,
      };

      const res = await fetch("/api/orders/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to reserve pickup slot.");
        setReservingHold(false);
        return;
      }

      // Store hold in context
      setHoldOrder(data.order);
      router.push("/checkout");
    } catch {
      setErrorMessage("Network error while securing oven capacity hold.");
      setReservingHold(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-stone-900 mb-2">Your Cake Box is Empty</h2>
        <p className="text-stone-600 text-sm max-w-md mx-auto mb-8">
          Explore our artisan creations and select your custom portion size, flavour infusion, and collection window.
        </p>
        <Link
          href="/menu"
          className="inline-flex px-8 py-3.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
        >
          Browse Seasonal Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
          Your Bakery Order
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Review customized items, verify pricing breakdown, and reserve your guaranteed pickup slot.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Items list & Date Slot Picker */}
        <div className="lg:col-span-7 space-y-8">
          {/* Cart Items */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
            <h2 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
              Selected Creations ({totalCakesCount})
            </h2>

            <div className="divide-y divide-stone-100">
              {items.map((item) => (
                <div key={item.cartItemId} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-stone-900 text-sm sm:text-base">
                          {item.name}
                        </h3>
                        <button
                          onClick={() => removeItem(item.cartItemId)}
                          className="text-stone-400 hover:text-red-600 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Options & Message details */}
                      <div className="text-xs text-stone-500 space-y-0.5 mt-1">
                        {item.sizeOption && (
                          <div>Size: <strong className="text-stone-700">{item.sizeOption.name}</strong></div>
                        )}
                        {item.flavourOption && (
                          <div>Flavour: <strong className="text-stone-700">{item.flavourOption.name}</strong></div>
                        )}
                        {item.cakeMessage && (
                          <div className="text-amber-900 flex items-center gap-1 font-medium bg-amber-50/80 px-2 py-0.5 rounded-md w-fit mt-1">
                            <MessageSquare className="w-3 h-3 text-amber-700" />
                            <span>Plaque: &ldquo;{item.cakeMessage}&rdquo; (+$2.50)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 border border-stone-200 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Item Total */}
                      <div className="font-serif text-base font-bold text-amber-900">
                        {formatPrice(
                          (item.basePriceInCents +
                            (item.sizeOption?.priceDeltaInCents || 0) +
                            (item.flavourOption?.priceDeltaInCents || 0) +
                            (item.cakeMessage ? 250 : 0)) *
                            item.quantity
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date & Slot Picker Component */}
          <div>
            <DatePickerSlotPicker />
          </div>

          {/* Special Instructions */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <label className="block text-sm font-semibold text-stone-800 mb-2">
              Dietary or Pickup Special Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder="e.g. Please box separately, birthday party pickup by coworker, etc."
              className="w-full p-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
            />
          </div>
        </div>

        {/* Right: Order Summary & Checkout Trigger */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm space-y-6 sticky top-28">
            <h2 className="font-serif text-xl font-bold text-stone-900 border-b border-stone-100 pb-3">
              Order Breakdown
            </h2>

            {/* Selected schedule preview */}
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                <Calendar className="w-4 h-4 text-amber-700" />
                <span>Pickup Schedule</span>
              </div>
              {pickupDate && pickupSlotTime ? (
                <div className="text-xs text-stone-700">
                  <div className="font-bold text-stone-900">{formatDatePretty(pickupDate)}</div>
                  <div className="text-amber-800 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {pickupSlotTime}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-stone-500 italic">
                  Please select date & slot on the left.
                </div>
              )}
            </div>

            {/* Fee Breakdown */}
            <div className="space-y-3 text-sm text-stone-600">
              <div className="flex justify-between">
                <span>Base Cake Subtotal:</span>
                <span>{formatPrice(subtotalInCents)}</span>
              </div>

              {customisationFeeInCents > 0 && (
                <div className="flex justify-between">
                  <span>Portion & Flavour Delicacies:</span>
                  <span>+{formatPrice(customisationFeeInCents)}</span>
                </div>
              )}

              {messageFeeInCents > 0 && (
                <div className="flex justify-between text-amber-900">
                  <span>Custom Hand-Piped Message Fees:</span>
                  <span>+{formatPrice(messageFeeInCents)}</span>
                </div>
              )}

              <div className="flex justify-between text-stone-500 text-xs">
                <span>Studio Tax & Packaging:</span>
                <span>Included</span>
              </div>

              <div className="pt-4 border-t border-stone-100 flex justify-between items-baseline font-bold text-stone-900">
                <span className="text-base">Total Due:</span>
                <span className="font-serif text-3xl text-amber-800">
                  {formatPrice(totalInCents)}
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              disabled={reservingHold}
              onClick={handleProceedToCheckout}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-base shadow-md transition-all flex items-center justify-center gap-2 ${
                reservingHold
                  ? "bg-amber-800/70 text-white cursor-wait"
                  : "bg-amber-700 hover:bg-amber-800 text-white hover:shadow-lg"
              }`}
            >
              {reservingHold ? (
                <span>Securing 10-Min Hold...</span>
              ) : (
                <>
                  <span>{user ? "Reserve Slot & Checkout" : "Log In to Reserve Slot"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-[11px] text-stone-500 text-center leading-relaxed">
              Clicking will lock the oven capacity for your chosen date with an atomic <strong>10-minute temporary reservation</strong> while you complete checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
