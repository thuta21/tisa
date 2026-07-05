"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCartItemId, type AddCartItem, type CartItem } from "@/lib/cart";

const STORAGE_KEY = "tisa-cart";

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  subtotal: number;
  addItem: (item: AddCartItem) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) setItems(JSON.parse(stored) as CartItem[]);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    hydrated,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + (item.unitPrice + (item.customizationFee ?? 0) + (item.armBadgeFee ?? 0)) * item.quantity, 0),
    addItem: (item) => {
      const id = getCartItemId(item);
      setItems((current) => {
        const existing = current.find((entry) => entry.id === id);
        if (existing) {
          return current.map((entry) =>
            entry.id === id
              ? { ...entry, quantity: entry.quantity + item.quantity }
              : entry,
          );
        }
        return [...current, { ...item, id }];
      });
    },
    updateQuantity: (id, quantity) => {
      if (quantity < 1) return;
      setItems((current) => current.map((item) => (
        item.id === id ? { ...item, quantity } : item
      )));
    },
    removeItem: (id) => setItems((current) => current.filter((item) => item.id !== id)),
    clearCart: () => setItems([]),
  }), [hydrated, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
