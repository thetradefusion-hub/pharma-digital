"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";

const ToastContext = React.createContext<{
  toast: (message: string, variant?: "default" | "error") => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [variant, setVariant] = React.useState<"default" | "error">("default");

  const toast = React.useCallback(
    (nextMessage: string, nextVariant: "default" | "error" = "default") => {
      setMessage(nextMessage);
      setVariant(nextVariant);
      setOpen(true);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        <ToastPrimitive.Root
          open={open}
          onOpenChange={setOpen}
          className={cn(
            "fixed bottom-4 right-4 z-50 rounded-md border px-4 py-3 text-sm shadow-soft",
            variant === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-surface-border bg-white text-slate-800",
          )}
        >
          <ToastPrimitive.Title>{message}</ToastPrimitive.Title>
        </ToastPrimitive.Root>
        <ToastPrimitive.Viewport />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
