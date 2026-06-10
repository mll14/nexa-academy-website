import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, BarChart3, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import apiConfig from "@/utils/apiConfig";
import toast from "react-hot-toast";
import programService from "@/services/programService";
import intakeService from "@/services/intakeService";

export function ProgramsSection() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [programsRes, intakesRes] = await Promise.all([
        programService.getActivePrograms(),
        intakeService.getAllIntakes(),
      ]);
      if (cancelled) return;

      // Build earliest intake per program
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

      if (programsRes.success && programsRes.data.length > 0) {
        const enriched = programsRes.data.map((p) => {
          const intake = intakesMap[p.programId] || null;
          return {
            ...p,
            duration: p.durationMonths
              ? `${p.durationMonths} Months`
              : p.duration || "—",
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
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="w-full bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-10 sm:space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="">
            <h2 className="font-semibold tracking-tight">
              Our <span className="text-primary">Programs</span>
            </h2>
            <div className="w-16 h-0.5 bg-primary mx-auto" />
          </div>
          <p className="text-muted-foreground">
            Industry-relevant programs designed to help you gain practical
            skills and grow your career.
          </p>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-muted animate-pulse"
                style={{ opacity: 1 - i * 0.2 }}
              />
            ))}
          </div>
        )}

        {/* Grid — 3 cols when full, centred otherwise */}
        {!loading && programs.length > 0 && (
          <div
            className={`grid gap-6 sm:gap-8 ${
              programs.length >= 3
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : programs.length === 2
                  ? "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto"
                  : "grid-cols-1 max-w-md mx-auto"
            }`}
          >
            {programs.map((program) => (
              <Card
                key={program.id}
                className="group border border-border rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col bg-background"
              >
                <CardContent className="p-5 sm:p-6 flex flex-col h-full space-y-6">
                  {/* Top - Identity + Outcome */}
                  <div className="space-y-2">
                    <h4 className="font-semibold leading-snug group-hover:text-primary transition-colors">
                      {program.title}
                    </h4>

                    <p className="text-muted-foreground leading-relaxed">
                      {program.description}
                    </p>
                  </div>

                  {/* Key Highlights (Less clutter, more meaning) */}
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-sm">
                      <Clock className="h-3.5 w-3.5" />
                      {program.duration}
                    </div>

                    <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-sm">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {program.level}
                    </div>

                    <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-fulltext-sm">
                      <Users className="h-3.5 w-3.5" />
                      {program.students}+ trained
                    </div>
                  </div>

                  {/* Timeline (More natural language) */}
                  <div className="text-xs space-y-1.5">
                    <p className="text-muted-foreground">
                      Starts{" "}
                      <span className="text-foreground font-medium">
                        {program.nextIntake}
                      </span>
                    </p>

                    <p className=" text-xstext-muted-foreground">
                      Apply by{" "}
                      <span className="text-foreground font-medium">
                        {program.applicationDeadline}
                      </span>
                    </p>
                  </div>

                  {/* Availability */}
                  {program.seatsRemaining != null && (
                    <div>
                      <span
                        className={`text-xs font-medium px-3 py-1 rounded-full ${
                          program.seatsRemaining <= 5
                            ? "bg-red-100 text-red-600"
                            : program.seatsRemaining <= 15
                              ? "bg-orange-100 text-orange-600"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {program.seatsRemaining <= 5
                          ? `Only ${program.seatsRemaining} spots left`
                          : `${program.seatsRemaining} spots available`}
                      </span>
                    </div>
                  )}

                  {/* CTA (Feels like guidance, not pressure) */}
                  <div className="mt-auto flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {program.comingSoon ? (
                      <>
                        <span className="inline-flex items-center justify-center rounded-md border border-transparent bg-muted px-2.5 h-9 text-sm font-medium text-muted-foreground">
                          Coming Soon
                        </span>
                        <ExpressInterestButton program={program} />
                      </>
                    ) : (
                      <>
                        <Link
                          to={`/apply`}
                          className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary text-white hover:bg-secondary h-9 px-2.5 text-sm font-medium transition-colors"
                        >
                          Apply Now
                        </Link>
                        <Link
                          to={
                            program.slug
                              ? `/programs/${program.slug}`
                              : "/programs"
                          }
                          className="inline-flex items-center justify-center text-primary underline-offset-4 hover:underline h-9 px-2.5 text-sm font-medium"
                        >
                          Learn More
                        </Link>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-center">
          <Link
            to="/programs"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary text-white hover:bg-primary/90 px-6 py-3 text-lg font-semibold transition-colors"
          >
            See More
          </Link>
        </div>
      </div>
    </section>
  );
}

function ExpressInterestButton({ program }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Please provide an email");
    setLoading(true);
    try {
      const res = await fetch(`${apiConfig.baseURL}/programs/interest/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          name: name || "",
          email,
          message: message || "",
          program_slug: program.slug,
          program_name: program.title,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let msg = `Request failed (${res.status})`;
        try {
          const parsed = JSON.parse(text || "{}");
          msg = parsed.detail || parsed.error || parsed.message || msg;
        } catch {
          if (text) msg = text;
        }
        throw new Error(msg);
      }
      toast.success("Thanks — we recorded your interest. We'll notify you.");
      setOpen(false);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      toast.error(err?.message || "Failed to submit interest");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary text-white hover:bg-primary/90 h-9 px-2.5 text-sm font-medium transition-colors"
      >
        Express Interest
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-9999 flex items-center justify-center px-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setOpen(false)}
            />
            <div className="relative max-w-md w-full mx-auto z-9999">
              <div className="bg-background border rounded-lg p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    Express interest — {program.title}
                  </h3>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={submit} className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Name (optional)
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Email *
                    </label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Message (optional)
                    </label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setOpen(false)}
                      type="button"
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-primary text-primary-foreground"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? "Submitting..." : "Submit"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
