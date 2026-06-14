"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import Link from "next/link";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
// @ts-ignore: CSS import without type declarations
import "react-phone-number-input/style.css";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Phone,
  BookOpen,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  PenLine,
  Wallet,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { Separator } from "@/components/ui/Separator";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { Field } from "@/components/application/Field";
import { SuccessScreen } from "@/components/application/SuccessScreen";
import {
  submitApplication,
  saveDraft,
  submitHelpMeLead,
  submitComingSoonInterest,
  getClientPrograms,
  getClientIntakes,
} from "@/lib/api/applications";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Program {
  id: string | number;
  slug: string;
  title: string;
  price: number | null;
  coming_soon: boolean;
}
interface Intake {
  id: string;
  start_date: string;
  application_deadline?: string;
  seats_remaining: number | null;
  status: string;
}

interface SuccessData {
  id?: string;
  full_name?: string;
  email?: string;
  program_name?: string;
  start_date?: string;
  estimated_fees?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAYMENT_PLANS = [
  { id: "full", name: "One-time Payment", note: "Best discount" },
  { id: "installment2", name: "2 Instalments", note: "10% surcharge" },
  { id: "installment3", name: "3 Instalments", note: "20% surcharge" },
];

const STEPS = [
  { label: "About You" },
  { label: "Program & Plan" },
  { label: "Review & Submit" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcFee(base: number, plan: string) {
  if (!base) return 0;
  if (plan === "full") return base;
  if (plan === "installment3")
    return Math.round((base * 1.2) / 3 / 500) * 500 * 3;
  return Math.round((base * 1.1) / 2 / 500) * 500 * 2;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  done
                    ? "bg-primary border-primary text-white"
                    : active
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/30 border-border text-muted-foreground"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : n}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium hidden sm:block ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-12 sm:w-20 mx-2 mb-4 rounded transition-all ${done ? "bg-primary" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const DEFAULT_TIMELINE = [
  { label: "Application review", value: "Under 2 hours" },
  { label: "Admissions follow-up", value: "Under 24 hours" },
  { label: "Final enrollment", value: "24–48 hours" },
];
const DEFAULT_WHY_NEXA = [
  "Free dedicated application guidance",
  "Clear payment plans and support",
  "Program roadmap from industry mentors",
  "Fast admissions process",
];
const DEFAULT_NEXT_STEPS = [
  "Our admissions team reviews your goals",
  "Optional orientation call with a mentor",
  "Final onboarding into the program group",
];

// ── Help-me-choose inline form ────────────────────────────────────────────────

function HelpMeForm({
  name,
  email,
  phone,
  onDone,
}: {
  name: string;
  email: string;
  phone?: string;
  onDone: () => void;
}) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await submitHelpMeLead({ name, email, phone, message: msg });
    setLoading(false);
    if (res.success) {
      setDone(true);
      setTimeout(onDone, 1800);
    } else toast.error(res.error ?? "Submission failed");
  }

  if (done)
    return (
      <div className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-4 text-success">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <p className="text-sm font-medium">
          Got it! Our team will reach out to guide you shortly.
        </p>
      </div>
    );

  return (
    <div className="sm:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">🤔</span>
        <div>
          <p className="text-sm font-semibold">
            Not sure which program fits you?
          </p>
          <p className="text-xs text-muted-foreground">
            Tell us about your goals and we&apos;ll reach out to guide you.
          </p>
        </div>
      </div>
      <Textarea
        rows={3}
        placeholder="What are you hoping to learn or achieve? Any background or career goals..."
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        disabled={loading}
      />
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="w-full h-10 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
            Sending…
          </>
        ) : (
          "Request Guidance"
        )}
      </button>
    </div>
  );
}

// ── Coming-soon interest form ─────────────────────────────────────────────────

function ComingSoonForm({
  name,
  email,
  phone,
  programSlug,
  programName,
  onDone,
}: {
  name: string;
  email: string;
  phone?: string;
  programSlug: string;
  programName: string;
  onDone: () => void;
}) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await submitComingSoonInterest({
      name,
      email,
      phone,
      program_slug: programSlug,
      program_name: programName,
      message: msg,
    });
    setLoading(false);
    if (res.success) {
      setDone(true);
      setTimeout(onDone, 1800);
    } else toast.error(res.error ?? "Submission failed");
  }

  if (done)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-4 text-success">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <p className="text-sm font-medium">
          You&apos;re on the list! We&apos;ll notify you when {programName}{" "}
          opens.
        </p>
      </div>
    );

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-warning shrink-0" />
        <div>
          <p className="text-sm font-semibold">
            No open intakes right now for {programName}
          </p>
          <p className="text-xs text-muted-foreground">
            Register your interest and we&apos;ll notify you when the next
            cohort opens.
          </p>
        </div>
      </div>
      <Textarea
        rows={2}
        placeholder="Any message for the admissions team? (optional)"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        disabled={loading}
      />
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="w-full h-10 rounded-lg bg-warning text-warning-foreground font-semibold text-sm hover:bg-warning/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
            Registering…
          </>
        ) : (
          "Notify Me When It Opens"
        )}
      </button>
    </div>
  );
}

export function ApplicationPageClient({
  admissionsTimeline,
  whyNexa,
  nextSteps,
}: {
  admissionsTimeline?: { label: string; value: string }[];
  whyNexa?: string[];
  nextSteps?: string[];
}) {
  const timeline = admissionsTimeline?.length
    ? admissionsTimeline
    : DEFAULT_TIMELINE;
  const whyItems = whyNexa?.length ? whyNexa : DEFAULT_WHY_NEXA;
  const stepsItems = nextSteps?.length ? nextSteps : DEFAULT_NEXT_STEPS;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [intakesLoading, setIntakesLoading] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    phone_country: "KE",
    hasBasicKnowledge: "",
    knowledgeDescription: "",
    program: "",
    startDate: "",
    paymentPlan: "full",
    message: "",
  });

  // Load programs on mount
  useEffect(() => {
    getClientPrograms().then((data) => {
      setPrograms(data);
      setProgramsLoading(false);
    });
  }, []);

  // Pre-fill program from ?program= query param
  useEffect(() => {
    const slug = searchParams.get("program");
    if (slug && programs.find((p) => p.slug === slug)) {
      setForm((f) => ({ ...f, program: slug }));
    }
  }, [searchParams, programs]);

  // Fetch intakes when program changes
  const fetchIntakes = useCallback(
    async (slug: string) => {
      const prog = programs.find((p) => p.slug === slug);
      if (!prog) {
        setIntakes([]);
        return;
      }
      setIntakesLoading(true);
      const data = await getClientIntakes(prog.id);
      setIntakes(
        data.filter((i) => i.status === "open" || i.status === "draft"),
      );
      setIntakesLoading(false);
    },
    [programs],
  );

  useEffect(() => {
    if (!form.program) {
      setIntakes([]);
      setForm((f) => ({ ...f, startDate: "" }));
      return;
    }
    fetchIntakes(form.program);
  }, [form.program, fetchIntakes]);

  // Auto-select first available intake
  useEffect(() => {
    if (
      intakes.length > 0 &&
      !intakes.find((i) => i.start_date === form.startDate)
    ) {
      setForm((f) => ({ ...f, startDate: intakes[0].start_date }));
    }
  }, [intakes, form.startDate]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement> | string) => {
      const val = typeof e === "string" ? e : e.target.value;
      setForm((f) => ({ ...f, [field]: val }));
      setErrors((f) => ({ ...f, [field]: "" }));
    };

  const currentProgram = programs.find((p) => p.slug === form.program);
  const selectedIntake =
    intakes.find((i) => i.start_date === form.startDate) ?? null;
  const base = currentProgram?.price ?? 0;
  const totalFee = calcFee(base, form.paymentPlan);
  const inst2Per = Math.round((base * 1.1) / 2 / 500) * 500;
  const inst3Per = Math.round((base * 1.2) / 3 / 500) * 500;
  const inst2Total = inst2Per * 2;
  const inst3Total = inst3Per * 3;

  const finance =
    form.paymentPlan === "full"
      ? {
          total: base,
          per: base,
          count: 1,
          label: "One-time payment",
          savings: inst3Total - base,
          savingsLabel: "vs 3-instalment plan",
        }
      : form.paymentPlan === "installment3"
        ? {
            total: inst3Total,
            per: inst3Per,
            count: 3,
            label: "3 instalments",
            savings: 0,
            savingsLabel: "",
          }
        : {
            total: inst2Total,
            per: inst2Per,
            count: 2,
            label: "2 instalments",
            savings: inst3Total - inst2Total,
            savingsLabel: "vs 3-instalment plan",
          };

  // ── Draft ─────────────────────────────────────────────────────────────────────

  async function tryDraft(stepNum: number) {
    if (!/\S+@\S+\.\S+/.test(form.email)) return;
    await saveDraft({
      email: form.email.trim(),
      full_name: form.fullName.trim(),
      phone: form.phone.trim(),
      program: form.program,
      program_name: currentProgram?.title ?? "",
      step_reached: stepNum,
    });
  }

  // ── Validation ────────────────────────────────────────────────────────────────

  function validateStep1() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2)
      e.fullName = "Full name is required (min 2 chars)";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      e.email = "A valid email is required";
    if (!form.phone || !isValidPhoneNumber(form.phone))
      e.phone = "A valid phone number is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e: Record<string, string> = {};
    if (!form.program) e.program = "Please choose a program";
    // Only require a start date when there are open intakes to choose from
    if (
      !form.startDate &&
      !currentProgram?.coming_soon &&
      form.program !== "__help_me__" &&
      intakes.length > 0
    )
      e.startDate = "Please choose a start date";
    if (
      form.program &&
      form.program !== "__help_me__" &&
      !currentProgram?.coming_soon
    ) {
      if (!form.hasBasicKnowledge)
        e.hasBasicKnowledge = "Please indicate if you have basic knowledge";
      if (form.hasBasicKnowledge === "yes" && !form.knowledgeDescription.trim())
        e.knowledgeDescription = "Please describe what you know";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  async function goNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    await tryDraft(step + 1);
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrev() {
    setErrors({});
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // "Help me choose" path — route to leads, not applications
      if (form.program === "__help_me__") {
        const result = await submitHelpMeLead({
          name: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          message: form.message.trim() || undefined,
        });
        if (result.success) {
          setSuccessData({
            full_name: form.fullName.trim(),
            email: form.email.trim(),
          });
        } else {
          toast.error(result.error ?? "Submission failed");
        }
        return;
      }

      let recaptchaToken: string | undefined;
      if (executeRecaptcha) {
        try {
          recaptchaToken = await executeRecaptcha("application_submit");
        } catch {
          // non-fatal — server is fail-open in dev
        }
      }
      const result = await submitApplication({
        full_name: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        phone_country: form.phone_country,
        has_basic_knowledge: form.hasBasicKnowledge === "yes",
        knowledge_description:
          form.hasBasicKnowledge === "yes"
            ? form.knowledgeDescription.trim()
            : "",
        program: form.program,
        program_name: currentProgram?.title ?? form.program,
        start_date: form.startDate,
        payment_plan: form.paymentPlan,
        estimated_fees: totalFee,
        message: form.message.trim(),
        status: "pending",
        source: "website",
        recaptchaToken,
      });
      if (result.success) {
        setSuccessData({
          id: result.id,
          full_name: form.fullName.trim(),
          email: form.email.trim(),
          program_name: currentProgram?.title ?? form.program,
          start_date: form.startDate,
          estimated_fees: totalFee,
        });
      } else {
        const isDuplicate = result.error
          ?.toLowerCase()
          .includes("already exists");
        if (isDuplicate) {
          toast.error(
            "An application already exists for this email address. Contact admissions if you need to update it.",
            { duration: 8000 },
          );
          setErrors((e) => ({
            ...e,
            email: "An application already exists for this email.",
          }));
          setStep(1);
        } else {
          toast.error(result.error ?? "Submission failed");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────────

  if (successData) {
    return (
      <SuccessScreen
        data={successData}
        onHome={() => router.push("/")}
        onContact={() => router.push("/contact")}
      />
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="font-semibold tracking-tight">
          Start Your <span className="text-primary">Tech Journey</span>
        </h1>
        <div className="w-16 h-0.5 bg-primary mx-auto" />
        <p className="text-muted-foreground">
          Fill out the form below to apply for your chosen program.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex justify-center">
        <StepIndicator current={step} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Form ── */}
        <div className="lg:col-span-8">
          <Card className="border border-border rounded-2xl">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* ── Step 1: About You ── */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold">Personal Information</h3>
                    </div>
                    <Separator />

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="sm:col-span-2">
                        <Field
                          label="Full Name"
                          required
                          error={errors.fullName}
                        >
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              className="pl-9"
                              placeholder="John Doe"
                              value={form.fullName}
                              onChange={set("fullName")}
                              disabled={loading}
                            />
                          </div>
                        </Field>
                      </div>

                      <Field
                        label="Email Address"
                        required
                        error={errors.email}
                      >
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="email"
                            className="pl-9"
                            placeholder="john@example.com"
                            value={form.email}
                            onChange={set("email")}
                            onBlur={() => {
                              if (/\S+@\S+\.\S+/.test(form.email)) tryDraft(1);
                            }}
                            disabled={loading}
                          />
                        </div>
                      </Field>

                      <Field label="Phone Number" required error={errors.phone}>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                          <PhoneInput
                            defaultCountry="KE"
                            international
                            value={form.phone}
                            onChange={(v) => {
                              setForm((f) => ({ ...f, phone: v ?? "" }));
                              setErrors((f) => ({ ...f, phone: "" }));
                            }}
                            onCountryChange={(c) =>
                              setForm((f) => ({
                                ...f,
                                phone_country: c ?? "KE",
                              }))
                            }
                            placeholder="Enter phone number"
                            className="pl-9 w-full h-11 rounded-md border border-border bg-background text-sm"
                            disabled={loading}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Program & Plan ── */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold">Program Details</h3>
                    </div>
                    <Separator />

                    {programsLoading ? (
                      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
                        <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Loading programs…
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="grid sm:grid-cols-2 gap-5">
                          <div className="sm:col-span-2">
                            <Field
                              label="Select Program"
                              required
                              error={errors.program}
                            >
                              <Select
                                value={form.program}
                                onValueChange={(v) => {
                                  setForm((f) => ({
                                    ...f,
                                    program: v,
                                    startDate: "",
                                  }));
                                  setErrors((f) => ({ ...f, program: "" }));
                                }}
                                disabled={loading}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a program" />
                                </SelectTrigger>
                                <SelectContent>
                                  {programs.map((p) => (
                                    <SelectItem key={p.slug} value={p.slug}>
                                      {p.title}
                                      {p.price != null
                                        ? ` — KSh ${p.price.toLocaleString()}`
                                        : ""}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="__help_me__">
                                    🤔 I don&apos;t know — help me choose
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>
                          </div>

                          {/* Help-me-choose note */}
                          {form.program === "__help_me__" && (
                            <div className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              <div>
                                <p className="text-sm font-semibold">
                                  No problem — our team will guide you
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Continue with your application and tell us
                                  about your goals in the next step. We&apos;ll
                                  match you to the right program.
                                </p>
                              </div>
                            </div>
                          )}

                          {form.program !== "__help_me__" &&
                            !currentProgram?.coming_soon &&
                            intakes.length > 0 && (
                              <Field
                                label="Preferred Start Date"
                                required
                                error={errors.startDate}
                              >
                                <Select
                                  value={form.startDate}
                                  onValueChange={(v) => {
                                    setForm((f) => ({ ...f, startDate: v }));
                                    setErrors((f) => ({ ...f, startDate: "" }));
                                  }}
                                  disabled={
                                    loading || intakesLoading || !form.program
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue
                                      placeholder={
                                        !form.program
                                          ? "Choose a program first"
                                          : intakesLoading
                                            ? "Loading dates…"
                                            : "Select a start date"
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {intakesLoading ? (
                                      <SelectItem value="_loading" disabled>
                                        Loading…
                                      </SelectItem>
                                    ) : (
                                      intakes.map((i) => {
                                        const dl = i.application_deadline
                                          ? new Date(
                                              i.application_deadline,
                                            ).toLocaleDateString("en-KE", {
                                              month: "short",
                                              day: "numeric",
                                            })
                                          : null;
                                        return (
                                          <SelectItem
                                            key={i.id}
                                            value={i.start_date}
                                          >
                                            {fmtDate(i.start_date)}
                                            {i.seats_remaining != null
                                              ? ` · ${i.seats_remaining} spots`
                                              : ""}
                                            {dl ? ` · Apply by ${dl}` : ""}
                                          </SelectItem>
                                        );
                                      })
                                    )}
                                  </SelectContent>
                                </Select>
                              </Field>
                            )}

                          {/* No open intakes — allow full application, team will confirm date */}
                          {form.program &&
                            form.program !== "__help_me__" &&
                            !currentProgram?.coming_soon &&
                            !intakesLoading &&
                            intakes.length === 0 && (
                              <div className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                                <CalendarDays className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-primary">
                                    No upcoming intakes scheduled
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    You can still apply — our admissions team
                                    will reach out to confirm your start date
                                    once a new cohort opens.
                                  </p>
                                </div>
                              </div>
                            )}

                          {/* Coming-soon program — register interest only */}
                          {form.program &&
                            form.program !== "__help_me__" &&
                            currentProgram?.coming_soon && (
                              <div className="sm:col-span-2">
                                <ComingSoonForm
                                  name={form.fullName}
                                  email={form.email}
                                  phone={form.phone}
                                  programSlug={form.program}
                                  programName={
                                    currentProgram?.title ?? form.program
                                  }
                                  onDone={() =>
                                    setSuccessData({
                                      full_name: form.fullName,
                                      email: form.email,
                                      program_name:
                                        currentProgram?.title ?? form.program,
                                    })
                                  }
                                />
                              </div>
                            )}

                          {/* Basic knowledge — only when a real program is selected */}
                          {form.program &&
                            form.program !== "__help_me__" &&
                            !currentProgram?.coming_soon && (
                              <>
                                <div className="sm:col-span-2">
                                  <Field
                                    label="Do you have basic knowledge of the chosen program?"
                                    required
                                    error={errors.hasBasicKnowledge}
                                  >
                                    <div className="flex gap-3">
                                      {(["yes", "no"] as const).map((v) => (
                                        <button
                                          key={v}
                                          type="button"
                                          onClick={() => {
                                            setForm((f) => ({
                                              ...f,
                                              hasBasicKnowledge: v,
                                              knowledgeDescription:
                                                v === "no"
                                                  ? ""
                                                  : f.knowledgeDescription,
                                            }));
                                            setErrors((f) => ({
                                              ...f,
                                              hasBasicKnowledge: "",
                                              knowledgeDescription: "",
                                            }));
                                          }}
                                          className={`flex-1 h-10 rounded-xl border text-sm font-medium transition-colors ${form.hasBasicKnowledge === v ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50"}`}
                                          disabled={loading}
                                        >
                                          {v === "yes" ? "Yes" : "No"}
                                        </button>
                                      ))}
                                    </div>
                                  </Field>
                                </div>

                                {form.hasBasicKnowledge === "yes" && (
                                  <div className="sm:col-span-2">
                                    <Field
                                      label="Please describe what basic knowledge you have"
                                      required
                                      error={errors.knowledgeDescription}
                                    >
                                      <Textarea
                                        rows={3}
                                        placeholder="e.g. I've done some HTML/CSS and basic Python"
                                        value={form.knowledgeDescription}
                                        onChange={(e) => {
                                          setForm((f) => ({
                                            ...f,
                                            knowledgeDescription:
                                              e.target.value,
                                          }));
                                          setErrors((f) => ({
                                            ...f,
                                            knowledgeDescription: "",
                                          }));
                                        }}
                                        disabled={loading}
                                      />
                                    </Field>
                                  </div>
                                )}
                              </>
                            )}

                          {/* Application deadline notice */}
                          {selectedIntake?.application_deadline &&
                            (() => {
                              const dl = new Date(
                                selectedIntake.application_deadline!,
                              );
                              const daysLeft = Math.ceil(
                                (dl.getTime() - Date.now()) / 86_400_000,
                              );
                              const urgent = daysLeft <= 7;
                              return (
                                <div
                                  className={`flex items-start gap-3 rounded-xl border p-3.5 ${urgent ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}
                                >
                                  <AlertCircle
                                    className={`w-4 h-4 mt-0.5 shrink-0 ${urgent ? "text-red-500" : "text-amber-500"}`}
                                  />
                                  <div>
                                    <p
                                      className={`text-sm font-semibold ${urgent ? "text-red-700" : "text-amber-700"}`}
                                    >
                                      Application deadline:{" "}
                                      {fmtDate(
                                        selectedIntake.application_deadline!,
                                      )}
                                    </p>
                                    <p
                                      className={`text-xs mt-0.5 ${urgent ? "text-red-600" : "text-amber-600"}`}
                                    >
                                      {daysLeft <= 0
                                        ? "Deadline has passed — contact admissions"
                                        : daysLeft === 1
                                          ? "Last day to apply!"
                                          : `${daysLeft} days remaining`}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                          {form.program !== "__help_me__" &&
                            !currentProgram?.coming_soon && (
                              <Field label="Payment Plan" required>
                                <Select
                                  value={form.paymentPlan}
                                  onValueChange={set("paymentPlan")}
                                  disabled={loading}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PAYMENT_PLANS.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.name} ({p.note})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </Field>
                            )}
                        </div>

                        {/* Fee summary */}
                        {base > 0 &&
                          form.program !== "__help_me__" &&
                          !currentProgram?.coming_soon && (
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                  <Wallet className="w-4 h-4 text-primary" />{" "}
                                  Estimated Program Fees
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {form.paymentPlan === "full"
                                    ? "One-time payment — no surcharge (best value)"
                                    : form.paymentPlan === "installment3"
                                      ? "Split into 3 equal instalments (20% surcharge)"
                                      : "Split into 2 equal instalments (10% surcharge)"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-3xl font-bold text-primary">
                                  KSh {finance.total.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {finance.count === 1
                                    ? "One-time"
                                    : `Total across ${finance.count} instalments`}
                                </p>
                                <div className="mt-3 text-sm text-muted-foreground space-y-0.5">
                                  <div className="flex justify-between gap-8">
                                    <span>Plan</span>
                                    <span className="font-medium text-foreground">
                                      {finance.label}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-8">
                                    <span>
                                      {finance.count === 1
                                        ? "Amount due"
                                        : "Per instalment"}
                                    </span>
                                    <span className="font-medium text-foreground">
                                      KSh {finance.per.toLocaleString()}
                                    </span>
                                  </div>
                                  {finance.savings > 0 && (
                                    <div className="flex justify-between gap-8 text-green-600 font-semibold">
                                      <span>
                                        You save ({finance.savingsLabel})
                                      </span>
                                      <span>
                                        KSh {finance.savings.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Step 3: Review & Submit ── */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">
                          {form.program === "__help_me__" ? "Guidance Request Summary" : "Application Summary"}
                        </h3>
                      </div>
                      <Separator />
                      <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border text-sm">
                        {[
                          { label: "Name", value: form.fullName },
                          { label: "Email", value: form.email },
                          { label: "Phone", value: form.phone },
                          ...(form.program !== "__help_me__" ? [{
                            label: "Program",
                            value: currentProgram?.title ?? form.program,
                          }] : [{ label: "Request", value: "Program guidance — team will reach out" }]),
                          ...(form.program !== "__help_me__" ? [
                          {
                            label: "Start Date",
                            value: form.startDate
                              ? fmtDate(form.startDate)
                              : "TBD — admissions team will confirm",
                          },
                          ...(selectedIntake?.application_deadline
                            ? [
                                {
                                  label: "Apply by",
                                  value: fmtDate(
                                    selectedIntake.application_deadline,
                                  ),
                                },
                              ]
                            : []),
                          {
                            label: "Payment Plan",
                            value:
                              PAYMENT_PLANS.find(
                                (p) => p.id === form.paymentPlan,
                              )?.name ?? "",
                          },
                          {
                            label: "Estimated Fees",
                            value: `KSh ${finance.total.toLocaleString()}`,
                          },
                          ] : []),
                        ].map(({ label, value }) => (
                          <div
                            key={label}
                            className="flex justify-between px-4 py-2.5"
                          >
                            <span className="text-muted-foreground">
                              {label}
                            </span>
                            <span className="font-medium text-right max-w-[60%]">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <PenLine className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Additional Details</h3>
                      </div>
                      <Separator />
                      <Field label="Why do you want to join this program? (Optional)">
                        <Textarea
                          rows={4}
                          placeholder="Tell us about your goals and expectations..."
                          value={form.message}
                          onChange={set("message")}
                          disabled={loading}
                          className="resize-none"
                        />
                      </Field>
                    </div>

                    {errors.submit && (
                      <p className="flex items-center gap-1.5 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" /> {errors.submit}
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                {/* Navigation */}
                <div className="flex gap-3">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={goPrev}
                      disabled={loading}
                      className="flex-none w-28 h-11 rounded-lg border border-border font-medium hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  )}

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={loading}
                      className="flex-1 h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing Application...
                        </>
                      ) : form.program === "__help_me__" ? (
                        "Request Guidance"
                      ) : (
                        "Submit Application"
                      )}
                    </button>
                  )}
                </div>

                {step === 3 && (
                  <p className="text-center text-xs text-muted-foreground -mt-4">
                    By submitting, you agree to our{" "}
                    <Link
                      href="/legal"
                      className="text-primary hover:underline"
                    >
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/legal"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">
          <Card className="border border-border rounded-2xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Admissions Timeline</h3>
              </div>
              <Separator />
              {timeline.map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between items-center text-sm rounded-lg bg-muted/30 px-3 py-2.5"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <Badge
                    variant="outline"
                    className="border-primary text-primary text-xs"
                  >
                    {value}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* <Card className="border border-border rounded-2xl">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold">Why Nexa?</h3>
              <Separator />
              <ul className="space-y-3 text-sm text-muted-foreground">
                {whyItems.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card> */}

          <Card className="border border-border rounded-2xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                <h4 className="font-semibold">Next Steps</h4>
              </div>
              <Separator />
              <ol className="space-y-3 text-sm text-muted-foreground">
                {stepsItems.map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
