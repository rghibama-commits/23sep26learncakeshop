"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  cartItemId: string; // Unique client ID
  productId: string;
  name: string;
  slug: string;
  imageUrl: string;
  basePriceInCents: number;
  quantity: number;
  sizeOption?: {
    id: string;
    name: string;
    priceDeltaInCents: number;
  };
  flavourOption?: {
    id: string;
    name: string;
    priceDeltaInCents: number;
  };
  cakeMessage?: string;
  referenceImageUrl?: string;
}

export interface HoldOrderInfo {
  id: string;
  orderNumber: string;
  expiresAt: string; // ISO string
  totalInCents: number;
  subtotalInCents: number;
  customisationFeeInCents: number;
  messageFeeInCents: number;
}

interface CartContextType {
  items: CartItem[];
  pickupDate: string | null; // YYYY-MM-DD
  pickupSlotId: string | null;
  pickupSlotTime: string | null; // e.g. "10:00 - 12:00"
  holdOrder: HoldOrderInfo | null;
  specialNotes: string;
  addItem: (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  setPickupSchedule: (date: string, slotId: string, slotTime: string) => void;
  setSpecialNotes: (notes: string) => void;
  setHoldOrder: (hold: HoldOrderInfo | null) => void;
  clearCart: () => void;
  subtotalInCents: number;
  customisationFeeInCents: number;
  messageFeeInCents: number;
  totalInCents: number;
  totalCakesCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [pickupDate, setPickupDate] = useState<string | null>(null);
  const [pickupSlotId, setPickupSlotId] = useState<string | null>(null);
  const [pickupSlotTime, setPickupSlotTime] = useState<string | null>(null);
  const [holdOrder, setHoldOrder] = useState<HoldOrderInfo | null>(null);
  const [specialNotes, setSpecialNotes] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore cart from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cakecart_items");
      if (saved) setItems(JSON.parse(saved));
      const savedDate = localStorage.getItem("cakecart_pickup_date");
      if (savedDate) setPickupDate(savedDate);
      const savedSlotId = localStorage.getItem("cakecart_slot_id");
      if (savedSlotId) setPickupSlotId(savedSlotId);
      const savedSlotTime = localStorage.getItem("cakecart_slot_time");
      if (savedSlotTime) setPickupSlotTime(savedSlotTime);
      const savedHold = localStorage.getItem("cakecart_hold_order");
      if (savedHold) {
        const parsed = JSON.parse(savedHold);
        // Only keep if not expired
        if (new Date(parsed.expiresAt) > new Date()) {
          setHoldOrder(parsed);
        } else {
          localStorage.removeItem("cakecart_hold_order");
        }
      }
    } catch (e) {
      console.error("Failed to restore cart from storage", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("cakecart_items", JSON.stringify(items));
      if (pickupDate) localStorage.setItem("cakecart_pickup_date", pickupDate);
      else localStorage.removeItem("cakecart_pickup_date");
      if (pickupSlotId) localStorage.setItem("cakecart_slot_id", pickupSlotId);
      else localStorage.removeItem("cakecart_slot_id");
      if (pickupSlotTime) localStorage.setItem("cakecart_slot_time", pickupSlotTime);
      else localStorage.removeItem("cakecart_slot_time");
      if (holdOrder) localStorage.setItem("cakecart_hold_order", JSON.stringify(holdOrder));
      else localStorage.removeItem("cakecart_hold_order");
    } catch (e) {
      console.error("Failed to persist cart", e);
    }
  }, [items, pickupDate, pickupSlotId, pickupSlotTime, holdOrder, isLoaded]);

  const addItem = (newItem: Omit<CartItem, "cartItemId">) => {
    const cartItemId = `${newItem.productId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setItems((prev) => [...prev, { ...newItem, cartItemId }]);
    // If cart changes, any existing hold is invalidated
    setHoldOrder(null);
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
    setHoldOrder(null);
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity } : item
      )
    );
    setHoldOrder(null);
  };

  const setPickupSchedule = (date: string, slotId: string, slotTime: string) => {
    setPickupDate(date);
    setPickupSlotId(slotId);
    setPickupSlotTime(slotTime);
    setHoldOrder(null);
  };

  const clearCart = () => {
    setItems([]);
    setPickupDate(null);
    setPickupSlotId(null);
    setPickupSlotTime(null);
    setHoldOrder(null);
    setSpecialNotes("");
    localStorage.removeItem("cakecart_items");
    localStorage.removeItem("cakecart_pickup_date");
    localStorage.removeItem("cakecart_slot_id");
    localStorage.removeItem("cakecart_slot_time");
    localStorage.removeItem("cakecart_hold_order");
  };

  // Pricing calculations
  const totalCakesCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotalInCents = items.reduce(
    (sum, item) => sum + item.basePriceInCents * item.quantity,
    0
  );

  const customisationFeeInCents = items.reduce((sum, item) => {
    const sizeDelta = item.sizeOption?.priceDeltaInCents || 0;
    const flavourDelta = item.flavourOption?.priceDeltaInCents || 0;
    return sum + (sizeDelta + flavourDelta) * item.quantity;
  }, 0);

  const messageFeeInCents = items.reduce((sum, item) => {
    if (item.cakeMessage && item.cakeMessage.trim().length > 0) {
      return sum + 250 * item.quantity; // $2.50 per cake with custom message
    }
    return sum;
  }, 0);

  const totalInCents = subtotalInCents + customisationFeeInCents + messageFeeInCents;

  return (
    <CartContext.Provider
      value={{
        items,
        pickupDate,
        pickupSlotId,
        pickupSlotTime,
        holdOrder,
        specialNotes,
        addItem,
        removeItem,
        updateQuantity,
        setPickupSchedule,
        setSpecialNotes,
        setHoldOrder,
        clearCart,
        subtotalInCents,
        customisationFeeInCents,
        messageFeeInCents,
        totalInCents,
        totalCakesCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
