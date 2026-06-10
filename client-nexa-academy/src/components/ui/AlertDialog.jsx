import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

export default function AlertDialog({
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  children,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!onConfirm) return setOpen(false);
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)} className={className}>
        {children}
      </span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <Card className="max-w-md w-full mx-auto z-50">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold">{title}</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">{description}</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  {cancelLabel}
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="bg-destructive text-destructive-foreground"
                >
                  {loading ? "Please wait..." : confirmLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
