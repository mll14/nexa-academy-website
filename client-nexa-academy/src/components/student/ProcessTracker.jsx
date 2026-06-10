import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  CreditCard,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Video,
} from "lucide-react";
import DepositProgress from "@/components/shared/DepositProgress";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import applicationService from "@/services/applicationService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";
import { SlotPicker, formatFullDateTime } from "@/components/shared/SlotPicker";

export const STAGES = [
  { key: "pending", label: "Application Submitted", icon: CheckCircle2 },
  { key: "reviewed", label: "Under Review", icon: Clock },
  { key: "approved", label: "Confirmed", icon: CheckCircle2 },
  { key: "interview_scheduled", label: "Interview Scheduled", icon: Calendar },
  { key: "interview_completed", label: "Interview Passed", icon: CheckCircle2 },
  { key: "enrolled", label: "Enrolled", icon: CreditCard },
];

export function getProcessProgress(status) {
  if (!status) return 0;
  const idx = STAGES.findIndex((s) => s.key === status);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / STAGES.length) * 100);
}

// ── ProcessTracker ───────────────────────────────────────────────────────────

export function ProcessTracker({
  currentStatus,
  applicationId,
  interviewSlot: initialSlot,
  onScheduled,
  onRequestPayment,
  depositedAmount = 0,
}) {
  const navigate = useNavigate();
  const currentIdx = STAGES.findIndex((s) => s.key === currentStatus);
  const [slot, setSlot] = useState(initialSlot || null);
  const [allSlots, setAllSlots] = useState([]); // [{time, status}]
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    setSlot(initialSlot || null);
  }, [initialSlot]);

  const fetchSlots = async () => {
    if (!applicationId) return;
    setSlotsLoading(true);
    setSlotsError(false);
    const res = await applicationService.getAvailableSlots(applicationId);
    if (res.success) {
      setAllSlots(res.slots);
    } else {
      setSlotsError(true);
      toast.error("Could not load available slots. Please try again.");
    }
    setSlotsLoading(false);
  };

  // Load slots when status becomes "approved" (initial booking)
  useEffect(() => {
    if (currentStatus !== "approved" || !applicationId) return;
    fetchSlots();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStatus, applicationId]);

  const handleConfirm = async (chosenTime) => {
    if (!applicationId) return;
    setSubmitting(true);
    const res = await applicationService.confirmInterview(applicationId, chosenTime);
    setSubmitting(false);
    if (res.success) {
      setSlot(res.slot);
      toast.success("Interview confirmed! Check your email for the Meet link.");
      if (typeof onScheduled === "function") onScheduled(res.slot);
    } else {
      toast.error(res.error || "Failed to confirm interview. Please try again.");
    }
  };

  const handleReschedule = async (chosenTime) => {
    if (!applicationId) return;
    setSubmitting(true);
    const res = await applicationService.rescheduleInterview(applicationId, chosenTime);
    setSubmitting(false);
    if (res.success) {
      setSlot(res.slot);
      setRescheduling(false);
      toast.success("Interview rescheduled!");
    } else {
      toast.error(res.error || "Failed to reschedule. Please try again.");
    }
  };

  // No application yet
  if (!currentStatus) {
    return (
      <div className="space-y-4 text-center py-4">
        <p className="font-semibold">You haven't applied yet</p>
        <p className="text-sm text-muted-foreground">
          Browse our programs and apply to get started on your journey.
        </p>
        <Button className="w-full" onClick={() => navigate("/programs")}>
          View Programs
        </Button>
        <Button variant="outline" className="w-full" onClick={() => navigate("/apply")}>
          Apply Now
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-0">
      {STAGES.map((stage, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const Icon = stage.icon;
        return (
          <div key={stage.key} className="flex items-start gap-4 group">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors shrink-0",
                  done ? "bg-primary border-primary text-primary-foreground" : "",
                  active ? "bg-primary/10 border-primary text-primary" : "",
                  !done && !active ? "bg-muted border-border text-muted-foreground" : "",
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              {idx < STAGES.length - 1 && (
                <div className={cn("w-0.5 h-8 mt-1", done ? "bg-primary" : "bg-border")} />
              )}
            </div>
            <div className="pb-8">
              <p
                className={cn(
                  "text-sm font-medium",
                  active || done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {stage.label}
              </p>
              {active && <p className="text-xs text-primary mt-0.5">Current stage</p>}
            </div>
          </div>
        );
      })}

      {/* Action cards */}
      <div className="mt-4">
        {/* ── Approved: slot picker ── */}
        {currentStatus === "approved" && (
          <Card className="border rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">Schedule Your Interview</h3>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Pick a 30-minute slot. All times are in East Africa Time (EAT).
              </p>
              {slotsLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Loading available times…
                </div>
              )}
              {!slotsLoading && slotsError && (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    Could not load available slots from Google Calendar.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setSlotsError(false);
                      setSlotsLoading(true);
                      const res = await applicationService.getAvailableSlots(applicationId);
                      setSlotsLoading(false);
                      if (res.success) setAvailableSlots(res.slots);
                      else setSlotsError(true);
                    }}
                  >
                    Retry
                  </Button>
                </div>
              )}
              {!slotsLoading && !slotsError && (
                <SlotPicker
                  slots={allSlots}
                  onConfirm={handleConfirm}
                  submitting={submitting}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Interview scheduled: Meet link + reschedule ── */}
        {currentStatus === "interview_scheduled" && slot && (
          <Card className="border rounded-2xl border-blue-200 bg-blue-50/40">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Interview Booked</h3>
              </div>
              <Separator />
              {!rescheduling ? (
                <>
                  {/* Interview time — the key info */}
                  <div className="rounded-lg bg-white border border-blue-100 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Interview time</p>
                    <p className="text-sm font-bold text-foreground">
                      {formatFullDateTime(slot.chosen_time)} EAT
                    </p>
                    {slot.confirmed_at && (
                      <p className="text-xs text-muted-foreground">
                        Booked on {new Date(slot.confirmed_at).toLocaleDateString("en-KE", {
                          day: "numeric", month: "long", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>

                  {[slot.meet_url, slot.zoom_link].find(u => /^https:\/\//i.test(u)) && (
                    <a
                      href={[slot.meet_url, slot.zoom_link].find(u => /^https:\/\//i.test(u))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 w-full justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Video className="w-4 h-4" /> {/^https:\/\//i.test(slot.meet_url) ? "Join Google Meet" : "Join Meeting"}
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    A confirmation was sent to your email with the Meet link.
                  </p>

                  {(() => {
                    const hoursUntil = slot.chosen_time
                      ? (new Date(slot.chosen_time) - Date.now()) / 3_600_000
                      : 0;
                    return hoursUntil > 24 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => { setRescheduling(true); if (!allSlots.length) fetchSlots(); }}
                      >
                        Reschedule Interview
                      </Button>
                    ) : hoursUntil > 0 ? (
                      <p className="text-xs text-center text-amber-600 font-medium">
                        Interview in less than 24 hours — rescheduling is no longer available.
                      </p>
                    ) : null;
                  })()}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Select a new time for your interview.
                  </p>
                  {slotsLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                      <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Loading available slots…
                    </div>
                  ) : (
                    <SlotPicker
                      slots={allSlots}
                      onConfirm={handleReschedule}
                      submitting={submitting}
                      confirmLabel="Reschedule Interview"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRescheduling(false)}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Interview completed ── */}
        {currentStatus === "interview_completed" && (
          <Card className="border rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">Interview Completed ✓</h3>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Congratulations! Make an initial deposit of{" "}
                <strong>KSh 10,000</strong> to secure your enrollment.
              </p>
              <DepositProgress
                depositedAmount={depositedAmount}
                applicationStatus="interview_completed"
              />
              {Number(depositedAmount) < 10000 && (
                <Button className="w-full" onClick={() => onRequestPayment?.()}>
                  Go to Payments
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Enrolled ── */}
        {currentStatus === "enrolled" && (
          <Card className="border rounded-2xl border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-primary">Enrolled ✓</h3>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Your initial deposit has been received. Please contact the admin to be enrolled
                in the cohort and added to the LMS.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Pending / reviewed ── */}
        {["pending", "reviewed"].includes(currentStatus) && (
          <Card className="border rounded-2xl">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold">What happens next</h3>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Our admissions team will review your application. Once approved, you'll be able
                to schedule your interview directly from this dashboard.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ProcessTracker;
