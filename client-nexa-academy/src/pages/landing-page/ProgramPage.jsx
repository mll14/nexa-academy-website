import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { setSeoData } from "../../utils/seoUtils";
import programService from "@/services/programService";
import intakeService from "@/services/intakeService";
import { Header } from "@/components/sections/landing-page/header";
import { Footer } from "@/components/sections/landing-page/Footer";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FinanceCalculator from "@/components/programs/FinanceCalculator";
import ProgramCard from "@/components/programs/ProgramCard";
import ComparePanel from "@/components/programs/ComparePanel";

// ── Main Page ───────────────────────────────────────────────────
const ProgramPage = () => {
  const [programs, setPrograms] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const MAX_COMPARE = 4;

  useEffect(() => {
    setSeoData("Programs");
    let cancelled = false;
    const load = async () => {
      const [programsRes, intakesRes] = await Promise.all([
        programService.getActivePrograms(),
        intakeService.getAllIntakes(),
      ]);
      if (cancelled) return;

      // Build a map: programId → earliest open intake
      const intakesMap = {};
      if (intakesRes.success) {
        intakesRes.intakes.forEach((intake) => {
          const existing = intakesMap[intake.programId];
          if (
            !existing ||
            new Date(intake.startDate) < new Date(existing.startDate)
          ) {
            intakesMap[intake.programId] = intake;
          }
        });
      }

      if (programsRes.success) {
        const enriched = programsRes.data.map((p) => {
          const intake = intakesMap[p.programId] || null;
          return {
            ...p,
            duration: p.durationMonths
              ? `${p.durationMonths} Months`
              : p.duration
                ? `${p.duration} Weeks`
                : "—",
            students: p.currentEnrolled ?? "—",
            nextIntake: intake
              ? new Date(intake.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : "TBA",
            applicationDeadline: intake?.applicationDeadline
              ? new Date(intake.applicationDeadline).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" },
                )
              : "—",
            seatsRemaining: intake?.seatsRemaining ?? null,
          };
        });
        setPrograms(enriched);
      }
      setProgramsLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const location = useLocation();
  const planFromQuery =
    new URLSearchParams(location.search).get("plan") || "one-time";

  // Scroll to fragment targets (e.g. #finance-calculator) when route/hash changes
  useEffect(() => {
    try {
      const hash = location.hash || window.location.hash || "";
      if (hash) {
        const id = hash.replace(/^#/, "");
        const el = document.getElementById(id);
        if (el) {
          // small timeout to allow element rendering
          setTimeout(
            () => el.scrollIntoView({ behavior: "smooth", block: "start" }),
            50,
          );
        }
      }
    } catch {
      // silent
    }
  }, [location]);

  const filtered = programs.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchLevel =
      level === "all" || p.level.toLowerCase().includes(level.toLowerCase());
    return matchSearch && matchLevel;
  });

  const comparePrograms = programs.filter((p) => compareIds.includes(p.id));

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= MAX_COMPARE) {
        // notify user they reached the limit
        toast.error(`You can compare up to ${MAX_COMPARE} programs`);
        return prev;
      }
      return [...prev, id];
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-10 sm:space-y-14">
          {/* Page Header */}
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="font-semibold tracking-tight">
              Our <span className="text-primary">Programs</span>
            </h1>
            <div className="w-16 h-0.5 bg-primary mx-auto" />
            <p className="text-muted-foreground py-1">
              Industry-relevant programs designed to help you gain practical
              skills and grow your career.
            </p>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative flex-1 max-w-7xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search programs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              <span className="text-muted-foreground">Showing</span>
              <span className="text-primary font-bold">{filtered.length}</span>
              <span className="text-muted-foreground">
                program{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            <Button
              variant={isCompareMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsCompareMode((p) => !p);
                setCompareIds([]);
              }}
              className={
                isCompareMode
                  ? "bg-primary text-white"
                  : "border-primary text-primary hover:bg-primary hover:text-white"
              }
            >
              {isCompareMode ? "Exit Compare" : "Compare Programs"}
            </Button>
          </div>

          {/* Compare Panel */}
          {isCompareMode && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">
                Side-by-Side Comparison
              </h2>
              <ComparePanel programs={comparePrograms} />
            </div>
          )}

          {/* Program Grid */}
          {programsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => (
                <ProgramCard
                  key={p.id}
                  program={p}
                  compareIds={compareIds}
                  onCompareToggle={toggleCompare}
                  isCompareMode={isCompareMode}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Search className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">No programs found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter.
              </p>
            </div>
          )}

          <Separator />

          {/* Finance Calculator */}
          {!programsLoading && programs.length > 0 && (
            <div id="finance-calculator">
              <FinanceCalculator
                key={planFromQuery}
                programList={programs}
                initialPlan={planFromQuery}
              />
            </div>
          )}

          <Separator />

          {/* CTA */}
          <div className="rounded-2xl bg-primary/5 border border-primary/20 px-6 sm:px-12 py-10 sm:py-14 text-center space-y-5">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Not sure which program is right for you?
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Our career advisors can help you choose the perfect path based on
              your goals and experience level.
            </p>
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 gap-2"
            >
              <a href="/contact">
                Get Free Career Counseling <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProgramPage;
