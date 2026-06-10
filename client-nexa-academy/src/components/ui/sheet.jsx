import React from "react";
import { createPortal } from "react-dom";

export function Sheet({ children }) {
  return <>{children}</>;
}

export function SheetTrigger({ children }) {
  return <>{children}</>;
}

export function SheetPortal({ children }) {
  if (typeof window === "undefined") return null;
  const el = document.getElementById("sheet-root") || document.body;
  return createPortal(children, el);
}

export function SheetOverlay({ open, onClick }) {
  if (!open) return null;
  return <div className="fixed inset-0 bg-black/30 z-40" onClick={onClick} />;
}

export function SheetContent({
  open,
  side = "right",
  children,
  className = "",
}) {
  if (!open) return null;
  const base =
    "fixed z-50 top-0 h-full bg-popover text-popover-foreground shadow-lg overflow-auto";
  const pos = side === "left" ? "left-0" : "right-0";
  const width = "w-full sm:w-[520px]";
  return (
    <div className={`${base} ${pos} ${width} ${className}`}>{children}</div>
  );
}

export function SheetHeader({ children, className = "p-4 border-b" }) {
  return <div className={className}>{children}</div>;
}

export function SheetTitle({ children, className = "font-semibold text-lg" }) {
  return <div className={className}>{children}</div>;
}

export function SheetClose({ children, onClick }) {
  return (
    <button onClick={onClick} className="absolute top-3 right-3">
      {children || "Close"}
    </button>
  );
}

export default Sheet;
