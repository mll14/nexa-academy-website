import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import programService from "@/services/programService";
import intakeService from "@/services/intakeService";
import { Header } from "@/components/sections/landing-page/header";
import { Footer } from "@/components/sections/landing-page/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { setSeoData } from "@/utils/seoUtils";
import {
  Clock,
  BarChart3,
  Users,
  Calendar,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Wallet,
  Loader2,
} from "lucide-react";

const whyEnrollFallback = [
  "Live weekly mentor sessions",
  "Industry-recognised certificate",
  "Job placement support",
  "Access to alumni network",
  "Portfolio-grade projects",
];

const ProgramDetail = () => {
  const { slug } = useParams();

  const [program, setProgram] = useState(null);
  const [programLoading, setProgramLoading] = useState(true);
  const [programError, setProgramError] = useState(null);
  const [intakes, setIntakes] = useState([]);
  const [intakesLoading, setIntakesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setProgramLoading(true);
    setProgramError(null);
    programService.getProgramBySlug(slug).then((res) => {
      if (cancelled) return;
      if (res.success && res.program) {
        setProgram(res.program);
        setSeoData(res.program.title);
      } else {
        setProgramError(res.error || "Program not found");
      }
      setProgramLoading(false);
    });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!program?.title) return;
    let cancelled = false;
    setIntakesLoading(true);
    intakeService.getIntakesByProgramName(program.title).then((res) => {
      if (!cancelled) {
        setIntakes(res.success ? res.intakes : []);
        setIntakesLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [program?.title]);

  if (programLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (programError || !program) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-20 text-center">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Program not found</h1>
            <p className="text-muted-foreground">
              The program you're looking for doesn't exist.
            </p>
            <Link
              to="/programs"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary text-white hover:bg-primary/90 mt-2 h-9 px-4 text-sm font-medium transition-colors"
            >
              Browse All Programs
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const curriculumToUse = program.curriculum?.length > 0 ? program.curriculum : [];
  const whyEnrollToUse =
    program.features?.length > 0
      ? program.features.map((f) => f.title)
      : whyEnrollFallback;
  const displayPrice = program.price ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 w-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-12">
          {/* Breadcrumb */}
          <Link
            to="/programs"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> All Programs
          </Link>

          {/* Hero */}
          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden border border-border">
              {program.image ? (
                <img
                  src={program.image}
                  alt={program.title}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                  decoding="async"
                  width="1200"
                  height="320"
                />
              ) : (
                <div className="w-full h-48 bg-muted" />
              )}

              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {program.icon && (
                      <img
                        src={program.icon}
                        alt="icon"
                        className="w-12 h-12 rounded-md bg-white/5 p-2"
                        loading="lazy"
                        decoding="async"
                        width="48"
                        height="48"
                      />
                    )}
                    <div>
                      <Badge className="bg-primary/10 text-primary border-0 text-xs hover:bg-primary/20">
                        {program.level}
                      </Badge>
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {program.title}
                      </h1>
                      <p className="text-sm text-muted-foreground max-w-2xl">
                        {program.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-5 text-sm pt-2">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />{" "}
                {program.durationMonths
                  ? `${program.durationMonths} Months`
                  : program.duration
                    ? `${program.duration} Weeks`
                    : "—"}
              </span>
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> {program.level}
              </span>
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />{" "}
                {program.currentEnrolled ?? "—"} graduates
              </span>
              {intakesLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" /> Loading dates…
                </span>
              ) : intakes.length > 0 ? (
                <>
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Next intake:{" "}
                    {new Date(intakes[0].startDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {intakes[0].applicationDeadline && (
                    <span className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-4 h-4" /> Deadline:{" "}
                      {new Date(intakes[0].applicationDeadline).toLocaleDateString(
                        "en-US",
                        { month: "long", day: "numeric", year: "numeric" },
                      )}
                    </span>
                  )}
                </>
              ) : null}
            </div>
          </div>

          <Separator />

          {/* Topics */}
          {program.topics?.length > 0 && (
            <div className="rounded-2xl bg-background border border-border p-4">
              <h3 className="text-sm font-semibold mb-3">Topics Covered</h3>
              <div className="flex flex-wrap gap-3">
                {program.topics.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center gap-2 bg-muted/20 px-3 py-1 rounded-lg text-sm"
                  >
                    {t.icon && <img src={t.icon} alt={t.name} className="w-5 h-5" />}
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Main content */}
            <div className="lg:col-span-8 space-y-10">
              {/* Curriculum */}
              {curriculumToUse.length > 0 && (
                <div className="space-y-5">
                  <h2 className="text-2xl font-semibold">Curriculum Overview</h2>
                  <div className="space-y-4">
                    {curriculumToUse.map((phase) => (
                      <Card key={phase.phase} className="border rounded-2xl">
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h3 className="font-semibold">
                              {phase.phase}: {phase.title}
                            </h3>
                            <Badge
                              variant="outline"
                              className="text-xs text-muted-foreground"
                            >
                              {phase.weeks}
                            </Badge>
                          </div>
                          <ul className="space-y-1.5">
                            {(phase.topics || []).map((t) => (
                              <li
                                key={t}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />{" "}
                                {t}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Why Enroll */}
              <div className="space-y-5">
                <h2 className="text-2xl font-semibold">What You'll Get</h2>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {whyEnrollToUse.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Outcomes */}
              {program.outcomes?.length > 0 && (
                <div className="space-y-5">
                  <h2 className="text-2xl font-semibold">Learning Outcomes</h2>
                  <ul className="space-y-2">
                    {program.outcomes.map((o) => (
                      <li key={o} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Per-program FAQ */}
              {program.faq?.length > 0 && (
                <div className="space-y-5">
                  <h2 className="text-2xl font-semibold">FAQs</h2>
                  <div className="space-y-3">
                    {program.faq.map((item, i) => (
                      <Card key={i} className="border rounded-2xl">
                        <CardContent className="p-4 space-y-1">
                          <p className="font-medium text-sm">{item.question}</p>
                          <p className="text-sm text-muted-foreground">{item.answer}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">
              <Card className="border rounded-2xl border-primary/20">
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-muted-foreground">KSh</span>
                      <span className="text-3xl font-bold text-primary">
                        {displayPrice != null ? displayPrice.toLocaleString() : "TBA"}
                      </span>
                    </div>
                    {program.originalPrice && (
                      <p className="text-xs text-muted-foreground line-through">
                        KSh {parseFloat(program.originalPrice).toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Flexible payment plans available
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">
                        {program.durationMonths
                          ? `${program.durationMonths} Months`
                          : program.duration
                            ? `${program.duration} Weeks`
                            : "—"}
                      </span>
                    </div>
                    {intakesLoading ? (
                      <div className="text-muted-foreground text-xs py-1">Loading intake info…</div>
                    ) : intakes.length > 0 ? (
                      <>
                        {intakes[0].seatsRemaining != null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Seats left</span>
                            <span
                              className={`font-medium ${
                                intakes[0].seatsRemaining <= 5 ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              {intakes[0].seatsRemaining}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Next intake</span>
                          <span className="font-medium">
                            {new Date(intakes[0].startDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {intakes[0].applicationDeadline && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Deadline</span>
                            <span className="font-medium text-destructive">
                              {new Date(intakes[0].applicationDeadline).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric", year: "numeric" },
                              )}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-muted-foreground text-xs py-1">
                        No upcoming intakes listed.
                      </div>
                    )}
                  </div>

                  <Link
                    to="/apply"
                    className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-primary text-white hover:bg-primary/90 h-9 px-4 text-sm font-medium transition-colors"
                  >
                    Apply Now
                  </Link>
                  <Link
                    to="/contact"
                    className="inline-flex w-full items-center justify-center rounded-md border border-primary text-primary hover:bg-primary hover:text-white h-9 px-4 text-sm font-medium transition-colors"
                  >
                    Ask a Question
                  </Link>
                </CardContent>
              </Card>

              <div className="rounded-2xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-2">
                <Wallet className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                Installment plans available. 2-payment split option on checkout.
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProgramDetail;
