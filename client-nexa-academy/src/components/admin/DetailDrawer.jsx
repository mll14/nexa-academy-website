import { useEffect, useState } from "react";
import {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import apiService from "@/services/apiService";
import applicationService from "@/services/applicationService";
import { statusText } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, Video } from "lucide-react";
import { SlotPicker, formatFullDateTime } from "@/components/shared/SlotPicker";
import toast from "react-hot-toast";
import React from "react";
import { useNavigate } from "react-router-dom";

// ── InterviewSection ──────────────────────────────────────────────────────────
// Shows ONE confirmed interview slot per applicant. Admin can book, reschedule,
// cancel, or mark complete. Uses confirm_interview (Google Calendar + Meet link).

function InterviewSection({ item, itemId, onRefresh }) {
  const slot = item?.interview_slot || null;
  const hasConfirmedSlot = !!(slot && (slot.gcal_event_id || slot.chosen_time));

  const [mode, setMode] = React.useState("view"); // "view" | "book" | "reschedule"
  const [slots, setSlots] = React.useState([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const loadSlots = async () => {
    setSlotsLoading(true);
    const res = await applicationService.getAvailableSlots(itemId);
    setSlotsLoading(false);
    if (res.success) {
      setSlots(res.slots);
    } else {
      toast.error("Could not load available slots from calendar");
    }
  };

  const handleBook = async (chosenTime) => {
    setSubmitting(true);
    const res = await applicationService.confirmInterview(itemId, chosenTime);
    setSubmitting(false);
    if (res.success) {
      toast.success("Interview booked!");
      setMode("view");
      onRefresh();
    } else {
      toast.error(res.error || "Failed to book interview");
    }
  };

  const handleReschedule = async (chosenTime) => {
    setSubmitting(true);
    const res = await applicationService.rescheduleInterview(itemId, chosenTime);
    setSubmitting(false);
    if (res.success) {
      toast.success("Interview rescheduled!");
      setMode("view");
      onRefresh();
    } else {
      toast.error(res.error || "Failed to reschedule");
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this interview? This will delete the Google Calendar event.")) return;
    const res = await applicationService.cancelInterview(itemId);
    if (res.success) {
      toast.success("Interview cancelled");
      onRefresh();
    } else {
      toast.error(res.error || "Failed to cancel");
    }
  };

  const handleComplete = async () => {
    try {
      await apiService.post(`/applications/${itemId}/complete_interview/`);
      toast.success("Interview marked complete");
      onRefresh();
    } catch (err) {
      toast.error(err?.message || "Failed to mark complete");
    }
  };

  // Slot picker for book / reschedule modes
  if (mode !== "view") {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {mode === "book" ? "Book Interview" : "Reschedule Interview"}
        </p>
        {slotsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading available slots…
          </div>
        ) : (
          <SlotPicker
            slots={slots}
            onConfirm={mode === "book" ? handleBook : handleReschedule}
            submitting={submitting}
            confirmLabel={mode === "book" ? "Book Interview" : "Reschedule Interview"}
          />
        )}
        <Button variant="ghost" size="sm" onClick={() => setMode("view")}>
          ← Back
        </Button>
      </div>
    );
  }

  // Confirmed slot — show details + actions
  if (hasConfirmedSlot) {
    const meetLink = slot.meet_url || slot.zoom_link;
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
            Confirmed Interview
          </p>
          <p className="text-sm font-bold text-foreground">
            {slot.chosen_time ? formatFullDateTime(slot.chosen_time) + " EAT" : "—"}
          </p>
          {slot.confirmed_at && (
            <p className="text-xs text-muted-foreground">
              Booked{" "}
              {new Date(slot.confirmed_at).toLocaleDateString("en-KE", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
          {meetLink && (
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Video className="w-3 h-3" />
              {slot.meet_url ? "Join Google Meet" : "Join Meeting"}
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleComplete}>
            ✓ Mark Complete
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setMode("reschedule");
              loadSlots();
            }}
          >
            Reschedule
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // No confirmed slot yet — offer to book
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        No interview booked yet. Pick a slot from the Google Calendar.
      </p>
      <Button
        size="sm"
        onClick={() => {
          setMode("book");
          loadSlots();
        }}
      >
        Book Interview
      </Button>
    </div>
  );
}

// ── DetailDrawer ──────────────────────────────────────────────────────────────

export default function DetailDrawer({ open, onClose, itemId, mode = 'application', intakeId }) {
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [intake, setIntake] = useState(null);
  const [intakeLoading, setIntakeLoading] = useState(false);

  const reloadItem = async () => {
    if (!itemId) return;
    try {
      const data = await apiService.get(`/applications/${itemId}/`);
      setItem(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!open || !itemId) return setItem(null);
      setLoading(true);
      try {
        const data = await apiService.get(`/applications/${itemId}/`);
        if (!mounted) return;
        setItem(data);
      } catch (e) {
        console.error(e);
        setItem(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => (mounted = false);
  }, [open, itemId]);

  useEffect(() => {
    if (mode !== 'intake' || !intakeId || !open) { setIntake(null); return; }
    let mounted = true;
    setIntakeLoading(true);
    apiService.get(`/intakes/${intakeId}/`)
      .then((data) => { if (mounted) setIntake(data); })
      .catch((e) => console.error(e))
      .finally(() => { if (mounted) setIntakeLoading(false); });
    return () => { mounted = false; };
  }, [open, intakeId, mode]);

  return (
    <Sheet>
      <SheetPortal>
        <SheetOverlay open={open} onClick={onClose} />
        <SheetContent open={open} side="right">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>{mode === 'intake' ? 'Intake Detail' : 'Application Detail'}</SheetTitle>
              <SheetClose onClick={onClose}>Close</SheetClose>
            </div>
          </SheetHeader>
          <div className="p-4">
            {mode === 'intake' ? (
              <>
                {intakeLoading && (
                  <p className="text-sm text-muted-foreground">Loading intake…</p>
                )}
                {!intakeLoading && !intake && (
                  <p className="text-sm text-muted-foreground">Intake not found.</p>
                )}
                {!intakeLoading && intake && (
                  <Card className="border rounded-2xl">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold">{intake.program_name || '—'}</h3>
                        <p className="text-xs text-muted-foreground">Cohort intake</p>
                      </div>
                      <Separator />
                      <div className="text-sm space-y-2">
                        <p><strong>Start date:</strong> {intake.start_date}</p>
                        <p><strong>End date:</strong> {intake.end_date || '—'}</p>
                        <p><strong>Deadline:</strong> {intake.application_deadline || '—'}</p>
                        <p><strong>Seats remaining:</strong> {intake.seats_remaining ?? '—'}</p>
                        <p><strong>Status:</strong> {intake.status}</p>
                        {intake.notes && <p><strong>Notes:</strong> {intake.notes}</p>}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <>
            {loading && (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
            {!loading && !item && (
              <p className="text-sm text-muted-foreground">No detail</p>
            )}
            {!loading && item && (
              <Card className="border rounded-2xl">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold">{item.full_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {item.email} · {item.phone}
                    </p>
                  </div>
                  <Separator />
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>Program:</strong> {item.program_name}
                    </p>
                    <p>
                      <strong>Estimated fees:</strong> KSh{" "}
                      {item.estimated_fees?.toLocaleString?.() ??
                        item.estimated_fees}
                    </p>
                    <p>
                      <strong>Status:</strong> {statusText(item.status)}
                    </p>
                    <p>
                      <strong>Message:</strong>
                    </p>
                    <p className="text-muted-foreground">{item.message}</p>
                  </div>
                  <Separator />

                  {/* Interview section — shown for approved and beyond */}
                  {(item.status === "approved" ||
                    item.status === "interview_scheduled" ||
                    item.status === "interview_completed") && (
                    <div className="mt-3 space-y-3">
                      <h4 className="font-semibold">Interview</h4>
                      {item.status === "interview_completed" ? (
                        <p className="text-sm text-muted-foreground">
                          Interview completed ✓ — awaiting payment deposit.
                        </p>
                      ) : (
                        <InterviewSection
                          item={item}
                          itemId={itemId}
                          onRefresh={reloadItem}
                        />
                      )}
                    </div>
                  )}

                  {/* Enrolled confirmation */}
                  {item.status === "enrolled" && (
                    <div className="mt-3 space-y-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <h4 className="font-semibold text-emerald-700">
                        Enrolled ✓
                      </h4>
                      <p className="text-sm text-emerald-600">
                        Initial deposit of KSh 10,000 received. Student is
                        officially enrolled.
                      </p>
                    </div>
                  )}

                  {item.user && (
                    <div className="mt-3">
                      <Button
                        onClick={() => {
                          const rawUid =
                            typeof item.user === "string"
                              ? item.user
                              : (item.user?.uid ??
                                item.user?.firebase_uid ??
                                item.user?.user?.uid ??
                                item.user?.id);
                          const uid =
                            rawUid != null ? String(rawUid).trim() : "";
                          if (!uid || uid === "undefined" || uid === "null") {
                            toast.error("Cannot determine student ID");
                            return;
                          }
                          navigate(`/admin/students/${uid}`);
                          if (typeof onClose === "function") onClose();
                        }}
                        className="w-full"
                      >
                        Open Student Detail / Payments
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
              </>
            )}
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}
