import { useEffect, useState, useMemo } from "react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Video, RefreshCw, Loader2 } from "lucide-react";
import AdminCalendar from "./AdminCalendar";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import apiService from "@/services/apiService";
import applicationService from "@/services/applicationService";
import toast from "react-hot-toast";
import { SlotPicker } from "@/components/shared/SlotPicker";


function formatDateTime(isoString) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleString("en-KE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function InterviewCard({ app, onCancel, onComplete, onRescheduleClick }) {
  const slot = app.interview_slot;
  const isToday =
    slot?.chosen_time &&
    new Date(slot.chosen_time).toDateString() === new Date().toDateString();

  return (
    <div className="p-4 border-b border-border last:border-0 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{app.full_name}</p>
          <p className="text-xs text-muted-foreground">{app.program_name}</p>
        </div>
        {isToday && (
          <Badge className="bg-blue-100 text-blue-700 border-0 text-xs shrink-0">
            Today
          </Badge>
        )}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-foreground">
          {formatDateTime(slot?.chosen_time)} EAT
        </p>
        {slot?.confirmed_at && (
          <p className="text-xs text-muted-foreground">
            Booked {new Date(slot.confirmed_at).toLocaleDateString("en-KE", {
              day: "numeric", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        )}
      </div>
      {(slot?.meet_url || slot?.zoom_link) && (
        <a
          href={slot.meet_url || slot.zoom_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <Video className="w-3 h-3" /> {slot?.meet_url ? "Join Meet" : "Join Meeting"}
        </a>
      )}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-7"
          onClick={() => onComplete(app.id)}
        >
          ✓ Complete
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-7"
          onClick={() => onRescheduleClick(app)}
        >
          Reschedule
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => onCancel(app.id)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: "interview_date", label: "Interview Date" },
  { value: "name",           label: "Name" },
];

const Interviews = () => {
  const [interviews, setInterviews]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [reschedulingApp, setReschedulingApp] = useState(null);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [actionLoading, setActionLoading]   = useState(false);
  const [search, setSearch]                 = useState("");
  const [sortBy, setSortBy]                 = useState("interview_date");
  const [sortOrder, setSortOrder]           = useState("asc");

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const res = await apiService.get("/applications/", {
        status: "interview_scheduled",
        page_size: 100,
      });
      const apps = res.results || res || [];
      const sorted = [...apps].sort((a, b) => {
        const ta = a.interview_slot?.chosen_time
          ? new Date(a.interview_slot.chosen_time).getTime()
          : Infinity;
        const tb = b.interview_slot?.chosen_time
          ? new Date(b.interview_slot.chosen_time).getTime()
          : Infinity;
        return ta - tb;
      });
      setInterviews(sorted);
    } catch {
      toast.error("Failed to load interviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
    // Auto-refresh every 60 seconds to pick up new bookings made by students
    const interval = setInterval(fetchInterviews, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleComplete = async (appId) => {
    setActionLoading(true);
    try {
      await apiService.post(`/applications/${appId}/complete_interview/`);
      toast.success("Interview marked as complete");
      fetchInterviews();
    } catch (e) {
      toast.error(e?.message || "Failed to complete interview");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (appId) => {
    if (!window.confirm("Cancel this interview? This will remove the Google Calendar event.")) return;
    setActionLoading(true);
    const res = await applicationService.cancelInterview(appId);
    setActionLoading(false);
    if (res.success) {
      toast.success("Interview cancelled");
      fetchInterviews();
    } else {
      toast.error(res.error || "Failed to cancel interview");
    }
  };

  const openReschedule = async (app) => {
    setReschedulingApp(app);
    setRescheduleSlots([]);
    setRescheduleLoading(true);
    const res = await applicationService.getAvailableSlots(app.id);
    setRescheduleLoading(false);
    if (res.success) setRescheduleSlots(res.slots);
    else toast.error("Could not load available slots");
  };

  const handleReschedule = async (chosenTime) => {
    if (!reschedulingApp || !chosenTime) return;
    setActionLoading(true);
    const res = await applicationService.rescheduleInterview(reschedulingApp.id, chosenTime);
    setActionLoading(false);
    if (res.success) {
      toast.success("Interview rescheduled");
      setReschedulingApp(null);
      setRescheduleSlots([]);
      fetchInterviews();
    } else {
      toast.error(res.error || "Failed to reschedule");
    }
  };

  // Client-side filter + sort
  const displayedInterviews = useMemo(() => {
    let list = [...interviews];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) => a.full_name?.toLowerCase().includes(q) || a.program_name?.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      if (sortBy === "name") {
        return (a.full_name || "").localeCompare(b.full_name || "");
      }
      const ta = a.interview_slot?.chosen_time ? new Date(a.interview_slot.chosen_time).getTime() : Infinity;
      const tb = b.interview_slot?.chosen_time ? new Date(b.interview_slot.chosen_time).getTime() : Infinity;
      return ta - tb;
    });
    if (sortOrder === "desc") list.reverse();
    return list;
  }, [interviews, search, sortBy, sortOrder]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Interviews
            </h1>
            <p className="text-sm text-muted-foreground">
              admissions@nexaacademy.co.ke · {interviews.length} scheduled
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchInterviews} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Custom admin calendar */}
          <AdminCalendar />

          {/* Upcoming interviews panel */}
          <div className="space-y-3">
            {/* Toolbar above the panel */}
            <AdminToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by name or program…"
              sortOptions={SORT_OPTIONS}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              onApply={() => {}}
              onReset={() => { setSortBy("interview_date"); setSortOrder("asc"); setSearch(""); }}
            />
            <Card className="border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-sm font-semibold">Upcoming Interviews</p>
                {displayedInterviews.length !== interviews.length && (
                  <span className="text-xs text-muted-foreground">{displayedInterviews.length} of {interviews.length}</span>
                )}
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : displayedInterviews.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {interviews.length === 0 ? "No interviews scheduled" : "No results match your search"}
                </div>
              ) : (
                <div>
                  {displayedInterviews.map((app) => (
                    <InterviewCard
                      key={app.id}
                      app={app}
                      onComplete={handleComplete}
                      onCancel={handleCancel}
                      onRescheduleClick={openReschedule}
                    />
                  ))}
                </div>
              )}
            </Card>

            {/* Reschedule — grid picker */}
            {reschedulingApp && (
              <Card className="border rounded-2xl border-orange-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      Reschedule — {reschedulingApp.full_name}
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => { setReschedulingApp(null); setRescheduleSlots([]); }}>
                      Cancel
                    </Button>
                  </div>
                  <Separator />
                  {rescheduleLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading calendar…
                    </div>
                  ) : (
                    <SlotPicker
                      slots={rescheduleSlots}
                      onConfirm={handleReschedule}
                      submitting={actionLoading}
                      confirmLabel="Reschedule Interview"
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Interviews;
