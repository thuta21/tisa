"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, Minus, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import type { Jersey } from "@/lib/jerseys";

export default function OrderPanel({
  jersey,
  open,
  onClose,
}: {
  jersey: Jersey | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [size, setSize] = useState("");
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const sizes = jersey?.sizes || ["S", "M", "L", "XL", "2XL"];
  const total = (jersey?.price || 0) * quantity;

  const handleSubmit = async () => {
    if (!jersey) return;

    setSubmitting(true);
    try {
      await Promise.resolve({
        jersey_id: jersey.id,
        jersey_name: jersey.name,
        size,
        custom_name: customName,
        custom_number: customNumber,
        quantity,
        total_price: total,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_address: shippingAddress,
      });
      setDone(true);
      toast({ title: "Order saved locally", description: "API integration is not connected yet." });
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const reset = () => {
    setStep(1);
    setSize("");
    setCustomName("");
    setCustomNumber("");
    setQuantity(1);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setShippingAddress("");
    setDone(false);
    onClose();
  };

  if (!jersey) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={reset}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border z-50 overflow-y-auto"
          >
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: done ? "100%" : `${(step / 2) * 100}%` }}
              />
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold font-display tracking-tight">
                  {done ? "Order Confirmed" : "Velocity Checkout"}
                </h3>
                <button onClick={reset} className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                  <X size={14} />
                </button>
              </div>

              {done ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Check size={28} className="text-primary" />
                  </div>
                  <h4 className="text-xl font-bold font-display mb-2">Thank You!</h4>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Your {jersey.name} order has been placed successfully.
                  </p>
                  <button onClick={reset} className="mt-8 px-6 py-3 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all font-mono">
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <>
                  {/* Jersey preview */}
                  <div className="flex gap-4 p-4 bg-card rounded-xl border border-border mb-6">
                    <div className="relative w-20 h-24 shrink-0">
                      <Image src={jersey.image_front} alt={jersey.name} fill sizes="80px" className="object-contain" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-primary font-mono">{jersey.collection}</p>
                      <p className="font-bold font-display text-sm">{jersey.name}</p>
                      <p className="text-primary font-bold mt-1 font-display">${jersey.price?.toFixed(2)}</p>
                    </div>
                  </div>

                  {step === 1 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground mb-3 block">Select Size</label>
                        <div className="flex gap-2 flex-wrap">
                          {sizes.map((s) => (
                            <button
                              key={s}
                              onClick={() => setSize(s)}
                              className={`px-4 py-2.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                                size === s
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border hover:border-primary/50 text-muted-foreground"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground mb-2 block">Custom Name (Optional)</label>
                        <input
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="e.g. MESSI"
                          className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm font-mono focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground mb-2 block">Custom Number (Optional)</label>
                        <input
                          value={customNumber}
                          onChange={(e) => setCustomNumber(e.target.value)}
                          placeholder="e.g. 10"
                          className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm font-mono focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground mb-2 block">Quantity</label>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:border-primary transition-colors">
                            <Minus size={14} />
                          </button>
                          <span className="text-lg font-mono font-bold w-10 text-center">{quantity}</span>
                          <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:border-primary transition-colors">
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-border">
                        <span className="text-sm text-muted-foreground font-mono">Total</span>
                        <span className="text-2xl font-bold text-primary font-display">${total.toFixed(2)}</span>
                      </div>

                      <button
                        onClick={() => size && setStep(2)}
                        disabled={!size}
                        className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-[0.15em] rounded-full transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed font-mono"
                      >
                        Continue to Shipping
                      </button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground mb-2 block">Full Name</label>
                        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm font-mono focus:border-primary focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground mb-2 block">Email</label>
                        <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="john@example.com" type="email" className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm font-mono focus:border-primary focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground mb-2 block">Phone</label>
                        <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+1 234 567 8900" className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm font-mono focus:border-primary focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground mb-2 block">Shipping Address</label>
                        <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} rows={3} placeholder="123 Main St, City, Country" className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm font-mono focus:border-primary focus:outline-none transition-colors resize-none" />
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => setStep(1)} className="flex-1 py-3 border border-border text-muted-foreground font-mono text-xs uppercase tracking-widest rounded-full hover:border-primary hover:text-primary transition-all">
                          Back
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={submitting || !customerName || !customerEmail || !shippingAddress}
                          className="flex-[2] py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-[0.15em] rounded-full transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed font-mono"
                        >
                          {submitting ? "Placing Order..." : `Place Order — $${total.toFixed(2)}`}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
