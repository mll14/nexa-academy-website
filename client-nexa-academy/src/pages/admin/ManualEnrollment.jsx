import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { AlertCircle, CheckCircle2, UserPlus, X, GraduationCap } from "lucide-react";
import apiService from "../../services/apiService";
import programService from "../../services/programService";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { Pagination } from "@/components/admin/Pagination";

// ── Enrolled Students List ──────────────────────────────────────

const SORT_OPTIONS = [
  { value: "applied_at", label: "Date Enrolled" },
  { value: "full_name",  label: "Name" },
];

const PROGRAM_FILTER_KEY = "program_name";

function EnrolledList() {
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [sortBy, setSortBy]         = useState("applied_at");
  const [sortOrder, setSortOrder]   = useState("desc");
  const [programFilter, setProgramFilter] = useState("");
  const [programs, setPrograms]     = useState([]);
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(10);
  const [total, setTotal]           = useState(0);

  const ordering = sortOrder === "asc" ? sortBy : `-${sortBy}`;

  useEffect(() => {
    programService.getActivePrograms().then((res) => {
      if (res.success) setPrograms(res.data);
    });
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        status:    "enrolled",
        search:    search || undefined,
        ordering,
        page,
        page_size: pageSize,
      };
      if (programFilter) params.program_name = programFilter;
      const data = await apiService.get("/applications/", params);
      const items = data.results || data;
      setStudents(Array.isArray(items) ? items : []);
      setTotal(data.count ?? (Array.isArray(items) ? items.length : 0));
    } catch {
      setError("Failed to load enrolled students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, ordering, page, pageSize, programFilter]); // eslint-disable-line

  const filterGroups = programs.length > 0
    ? [{
        key: PROGRAM_FILTER_KEY,
        label: "Program",
        options: programs.map((p) => ({ value: p.title, label: p.title })),
      }]
    : [];

  return (
    <div className="space-y-4">
      <AdminToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by name or email…"
        sortOptions={SORT_OPTIONS}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        filterGroups={filterGroups}
        activeFilters={{ [PROGRAM_FILTER_KEY]: programFilter }}
        onFilterChange={(k, v) => { if (k === PROGRAM_FILTER_KEY) setProgramFilter(v); }}
        onApply={() => { setPage(1); load(); }}
        onReset={() => {
          setSortBy("applied_at");
          setSortOrder("desc");
          setProgramFilter("");
          setPage(1);
        }}
      />

      {error && (
        <div className="px-4 py-3 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20">
          {error}
        </div>
      )}

      <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse m-3 rounded-xl" style={{ opacity: 1 - i * 0.15 }} />
          ))
        ) : students.length === 0 ? (
          <div className="text-center py-14 space-y-2">
            <GraduationCap className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No enrolled students found.</p>
          </div>
        ) : (
          students.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-emerald-700">
                  {(s.full_name || "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{s.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.email} · {s.program_name}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Enrolled</Badge>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {s.applied_at
                    ? new Date(s.applied_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        label="enrolled students"
      />
    </div>
  );
}

// ── Enrollment Sheet Form ───────────────────────────────────────

function EnrollmentSheet({ open, onClose, onSuccess }) {
  const [programs, setPrograms]         = useState([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [formData, setFormData]         = useState({
    student_email: "",
    program: "",
    start_date: "",
    amount: "",
  });
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState("");
  const [error, setError]       = useState("");

  useEffect(() => {
    programService.getActivePrograms().then((res) => {
      if (res.success) setPrograms(res.data);
      setProgramsLoading(false);
    });
  }, []);

  const set = (field) => (e) => {
    setFormData((p) => ({ ...p, [field]: e.target.value }));
    setError("");
    setSuccess("");
  };

  const handleProgramChange = (e) => {
    const slug = e.target.value;
    const prog = programs.find((p) => p.slug === slug) || null;
    setSelectedProgram(prog);
    setFormData((prev) => ({
      ...prev,
      program: slug,
      amount: prog?.price != null ? String(prog.price) : "",
    }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student_email || !formData.program || !formData.start_date || !formData.amount) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    try {
      await apiService.post("/enrollments/", {
        ...formData,
        amount: Number(formData.amount),
      });
      const name = selectedProgram?.title || formData.program;
      setSuccess(`${formData.student_email} enrolled in ${name}.`);
      setFormData({ student_email: "", program: "", start_date: "", amount: "" });
      setSelectedProgram(null);
      onSuccess?.();
    } catch {
      setError("Enrollment failed. Please check the details and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess("");
    setError("");
    onClose();
  };

  return (
    <SheetPortal>
      <SheetOverlay open={open} onClick={handleClose} />
      <SheetContent open={open} side="right">
        <SheetHeader>
          <SheetTitle>Enroll a Student</SheetTitle>
          <SheetClose onClick={handleClose}>
            <X className="w-4 h-4" />
          </SheetClose>
        </SheetHeader>

        <div className="p-5 space-y-5">
          <p className="text-sm text-muted-foreground">
            Directly enroll a student into a program and record the amount paid.
          </p>

          {success && (
            <div className="flex items-start gap-3 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {success}
            </div>
          )}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Student Email</Label>
              <Input
                type="email"
                placeholder="student@example.com"
                value={formData.student_email}
                onChange={set("student_email")}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Program</Label>
              <select
                value={formData.program}
                onChange={handleProgramChange}
                disabled={loading || programsLoading}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">
                  {programsLoading ? "Loading programs…" : "Select a program"}
                </option>
                {programs.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.title}
                  </option>
                ))}
              </select>
              {selectedProgram && (
                <p className="text-xs text-muted-foreground">
                  {selectedProgram.category && (
                    <span className="capitalize">{selectedProgram.category} · </span>
                  )}
                  {selectedProgram.duration && <span>{selectedProgram.duration} · </span>}
                  {selectedProgram.level && <span>{selectedProgram.level}</span>}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={set("start_date")}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Amount Paid (KSh)</Label>
              <Input
                type="number"
                placeholder="e.g. 150000"
                min="0"
                value={formData.amount}
                onChange={set("amount")}
                disabled={loading}
              />
              {selectedProgram?.price != null && (
                <p className="text-xs text-muted-foreground">
                  Full fee: KSh {Number(selectedProgram.price).toLocaleString("en-KE")}
                  {selectedProgram.originalPrice && (
                    <span className="line-through ml-1 text-muted-foreground/60">
                      {Number(selectedProgram.originalPrice).toLocaleString("en-KE")}
                    </span>
                  )}
                </p>
              )}
            </div>

            <Separator />

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white hover:bg-primary/90 gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? "Enrolling…" : "Enroll Student"}
            </Button>
          </form>
        </div>
      </SheetContent>
    </SheetPortal>
  );
}

// ── Page ────────────────────────────────────────────────────────

const ManualEnrollment = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Enrolled Students
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Students who have completed the full admissions process
            </p>
          </div>
          <Button
            onClick={() => setSheetOpen(true)}
            className="gap-2 bg-primary text-white hover:bg-primary/90"
          >
            <UserPlus className="w-4 h-4" />
            Enroll Student
          </Button>
        </div>

        {/* Enrolled students list — re-mounts on refreshKey change to reload */}
        <EnrolledList key={refreshKey} />
      </div>

      {/* Enrollment Sheet */}
      <EnrollmentSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => {
          setSheetOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />
    </AdminLayout>
  );
};

export default ManualEnrollment;
