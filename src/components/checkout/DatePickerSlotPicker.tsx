"use client";

import React, { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { Calendar, Clock, AlertCircle, CheckCircle2, Flame, Ban } from "lucide-react";
import { formatDatePretty } from "@/lib/format";

interface SlotItem {
  id: string;
  startTime: string;
  endTime: string;
  maxOrders: number;
  reservedOrders: number;
  remainingOrders: number;
  isAvailable: boolean;
}

interface DateAvailability {
  date: string;
  maxCakes: number;
  reservedCakes: number;
  remainingCakes: number;
  isClosed: boolean;
  isLeadTimeEligible: boolean;
  isAvailable: boolean;
  statusReason: string;
  slots: SlotItem[];
}

export function DatePickerSlotPicker() {
  const { pickupDate, pickupSlotId, setPickupSchedule, totalCakesCount } = useCart();
  const [availability, setAvailability] = useState<DateAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAvailability() {
      try {
        const res = await fetch("/api/availability");
        const data = await res.json();
        if (res.ok && data.availability) {
          setAvailability(data.availability);
        } else {
          setError(data.error || "Failed to load bakery calendar");
        }
      } catch {
        setError("Network error fetching available pickup dates.");
      } finally {
        setLoading(false);
      }
    }
    loadAvailability();
  }, []);

  const selectedDateRecord = availability.find((a) => a.date === pickupDate);

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 animate-pulse">
        <div className="w-8 h-8 mx-auto border-3 border-amber-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm text-stone-600 font-medium">Checking live bakery capacity and oven slots...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
      {/* Notice Banner */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-xs text-amber-900 leading-relaxed">
        <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-950">Artisan Baking Rule:</span> All creations require a{" "}
          <strong>minimum 48-hour advance notice</strong> so our pastry chefs can proof, bake, and chill to perfection. Each day has a strict maximum batch capacity to ensure peak quality.
        </div>
      </div>

      {/* Date Picker Grid */}
      <div>
        <label className="block text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-700" />
          <span>1. Select Collection Date</span>
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {availability.map((day) => {
            const isSelected = pickupDate === day.date;
            const hasEnoughCapacity = day.remainingCakes >= (totalCakesCount || 1);
            const isClickable = day.isAvailable && hasEnoughCapacity;

            // Capacity indicator bar %
            const capacityPercent = Math.min(
              100,
              Math.round((day.reservedCakes / (day.maxCakes || 1)) * 100)
            );

            return (
              <button
                type="button"
                key={day.date}
                disabled={!isClickable}
                onClick={() => {
                  if (isClickable) {
                    // Set first available slot or clear slot
                    const firstSlot = day.slots.find((s) => s.isAvailable);
                    if (firstSlot) {
                      setPickupSchedule(day.date, firstSlot.id, `${firstSlot.startTime} - ${firstSlot.endTime}`);
                    } else {
                      setPickupSchedule(day.date, "", "");
                    }
                  }
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isSelected
                    ? "bg-amber-800 text-white border-amber-800 ring-2 ring-amber-700/30 shadow-md"
                    : isClickable
                    ? "bg-white border-stone-200 hover:border-amber-400 hover:bg-amber-50/30 text-stone-800"
                    : "bg-stone-50 border-stone-200/60 opacity-60 cursor-not-allowed text-stone-400"
                }`}
              >
                <div>
                  <div className={`text-xs font-semibold uppercase tracking-wider ${isSelected ? "text-amber-200" : "text-stone-500"}`}>
                    {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className="font-serif text-lg font-bold leading-tight mt-0.5">
                    {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-current/10">
                  {!day.isLeadTimeEligible ? (
                    <span className="text-[10px] flex items-center gap-1 font-medium text-amber-700">
                      <Clock className="w-3 h-3" /> &lt; 48h Notice
                    </span>
                  ) : day.isClosed ? (
                    <span className="text-[10px] flex items-center gap-1 font-medium text-rose-600">
                      <Ban className="w-3 h-3" /> Bakery Closed
                    </span>
                  ) : day.remainingCakes === 0 ? (
                    <span className="text-[10px] flex items-center gap-1 font-medium text-rose-600">
                      Sold Out
                    </span>
                  ) : !hasEnoughCapacity ? (
                    <span className="text-[10px] font-medium text-rose-600">
                      Only {day.remainingCakes} left
                    </span>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className={isSelected ? "text-amber-200" : "text-stone-500"}>
                          {day.remainingCakes} of {day.maxCakes} left
                        </span>
                        {day.remainingCakes <= 3 && (
                          <Flame className={`w-3 h-3 ${isSelected ? "text-amber-300" : "text-orange-500"}`} />
                        )}
                      </div>
                      <div className="h-1 rounded-full bg-stone-200/50 overflow-hidden">
                        <div
                          className={`h-full ${isSelected ? "bg-amber-300" : "bg-amber-600"}`}
                          style={{ width: `${capacityPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pickup Slot Picker */}
      {selectedDateRecord && selectedDateRecord.isAvailable && (
        <div className="pt-4 border-t border-stone-100">
          <label className="block text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-700" />
            <span>2. Choose 2-Hour Collection Window for {formatDatePretty(selectedDateRecord.date)}</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {selectedDateRecord.slots.map((slot) => {
              const isSelected = pickupSlotId === slot.id;
              const isSlotAvailable = slot.isAvailable;
              const timeLabel = `${slot.startTime} - ${slot.endTime}`;

              return (
                <button
                  type="button"
                  key={slot.id}
                  disabled={!isSlotAvailable}
                  onClick={() => {
                    if (isSlotAvailable) {
                      setPickupSchedule(selectedDateRecord.date, slot.id, timeLabel);
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? "bg-amber-700 text-white border-amber-700 shadow-md ring-2 ring-amber-600/30"
                      : isSlotAvailable
                      ? "bg-white border-stone-200 hover:border-amber-400 hover:bg-amber-50/30 text-stone-800"
                      : "bg-stone-50 border-stone-200/60 opacity-50 cursor-not-allowed text-stone-400"
                  }`}
                >
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    {timeLabel}
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-200" />}
                  </div>
                  <div className={`text-[11px] ${isSelected ? "text-amber-200" : "text-stone-500"}`}>
                    {isSlotAvailable ? `${slot.remainingOrders} collection spot(s) open` : "Fully Booked"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
