import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from "react-google-recaptcha-v3";
import applicationService from "../../services/applicationService";
import programService from "../../services/programService";
import { setSeoData } from "../../utils/seoUtils";

import { Header } from "@/components/sections/landing-page/header";
import { Footer } from "@/components/sections/landing-page/Footer";
import SuccessScreen from "@/components/application/SuccessScreen";
import Field from "@/components/application/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
import toast from "react-hot-toast";
import intakeService from "@/services/intakeService";

const PAYMENT_PLANS = [
  { id: "full", name: "One-time Payment", note: "Best discount" },
  { id: "installment2", name: "2 Installments", note: "8% surcharge" },
  { id: "installment3", name: "3 Installments", note: "15% surcharge" },
];

const RECAPTCHA_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() || "";
const RECAPTCHA_DISABLED =
  (import.meta.env.VITE_RECAPTCHA_DISABLED || "false") === "true";
const RECAPTCHA_ENABLED = Boolean(RECAPTCHA_SITE_KEY) && !RECAPTCHA_DISABLED;
const RECAPTCHA_ACTION = "application_submit";

const STEPS = [
  { label: "About You" },
  { label: "Program & Plan" },
  { label: "Review & Submit" },
];

function calcFeeFromBase(base, plan) {
  if (!base) return 0;
  if (plan === "full") return base;
  if (plan === "installment3") {
    const per = Math.round((base * 1.2) / 3 / 500) * 500;
    return per * 3;
  }
  const per = Math.round((base * 1.1) / 2 / 500) * 500;
  return per * 2;
}

// ── Step indicator ────────────────────────────────────────────────
function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center">
      {STEPS.map((s, i) => {
        const num = i + 1;
        const done = num < currentStep;
        const active = num === currentStep;
        return (
          <div key={num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  done
                    ? "bg-primary border-primary text-primary-foreground"
                    : active
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/30 border-border text-muted-foreground"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : num}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium hidden sm:block ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-12 sm:w-20 mx-2 mb-4 rounded transition-all ${
                  done ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main content ─────────────────────────────────────────────────
const ApplicationPageContent = ({ executeRecaptcha }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [apiPrograms, setApiPrograms] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(true);

  useEffect(() => {
    programService.getActivePrograms().then((res) => {
      if (res.success) {
        const active = res.data.filter((p) => !p.comingSoon);
        setApiPrograms(active);
      }
      setProgramsLoading(false);
    });
  }, []);

  const visiblePrograms = apiPrograms;

  const [step, setStep] = useState(1);
  // eslint-disable-next-line no-unused-vars
  const [draftId, setDraftId] = useState(null);

  const [formData, setFormData] = useState(() => {
    return {
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
    };
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [estimatedFees, setEstimatedFees] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [applicationData, setApplicationData] = useState(null);
  const [intakes, setIntakes] = useState([]);
  const [intakesLoading, setIntakesLoading] = useState(false);

  useEffect(() => {
    setSeoData("apply");
  }, []);

  const fetchIntakes = useCallback(
    async (programSlug) => {
      const prog = visiblePrograms.find((p) => p.slug === programSlug);
      if (!prog) return;
      setIntakesLoading(true);
      const res = await intakeService.getIntakesByProgramName(prog.title);
      setIntakes(res.success ? res.intakes : []);
      setIntakesLoading(false);
    },
    [visiblePrograms],
  );

  useEffect(() => {
    if (!formData.program) {
      setIntakes([]);
      setFormData((p) => ({ ...p, startDate: "" }));
      return;
    }
    fetchIntakes(formData.program);
  }, [formData.program, fetchIntakes]);

  useEffect(() => {
    const prefill = location.state?.prefill;
    const qp = new URLSearchParams(location.search).get("program");
    let programCandidate = null;
    if (
      prefill?.programSlug &&
      visiblePrograms.find((v) => v.slug === prefill.programSlug)
    ) {
      programCandidate = prefill.programSlug;
    } else if (qp && visiblePrograms.find((v) => v.slug === qp)) {
      programCandidate = qp;
    }

    if (prefill || programCandidate) {
      setFormData((p) => ({
        ...p,
        fullName: prefill?.fullName || p.fullName,
        email: prefill?.email || p.email,
        program: programCandidate || p.program,
        startDate: prefill?.startDate || p.startDate,
      }));
    }
  }, [location.state, location.search, visiblePrograms]);

  useEffect(() => {
    const validDates = intakes.map((i) => i.startDate);
    if (validDates.length > 0 && !validDates.includes(formData.startDate)) {
      setFormData((p) => ({ ...p, startDate: validDates[0] }));
    }
    const prog = visiblePrograms.find((p) => p.slug === formData.program);
    setEstimatedFees(calcFeeFromBase(prog?.price ?? 0, formData.paymentPlan));
  }, [
    intakes,
    formData.program,
    formData.paymentPlan,
    formData.startDate,
    visiblePrograms,
  ]);

  const set = (field) => (e) => {
    const val = typeof e === "string" ? e : e.target.value;
    setFormData((p) => ({ ...p, [field]: val }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  // ── Draft saving (best-effort, silent) ───────────────────────
  const saveDraft = async (stepNum) => {
    const email = formData.email.trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;
    try {
      const result = await applicationService.saveDraft({
        email,
        full_name: formData.fullName.trim(),
        program: formData.program,
        step_reached: stepNum ?? step,
      });
      if (result.success && result.id) setDraftId(result.id);
    } catch {
      // silent
    }
  };

  const handleEmailBlur = () => {
    const email = formData.email.trim();
    if (/\S+@\S+\.\S+/.test(email)) saveDraft(1);
  };

  // ── Per-step validation ───────────────────────────────────────
  const validateStep1 = () => {
    const e = {};
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2)
      e.fullName = "Full name is required (min 2 chars)";
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email))
      e.email = "A valid email is required";
    if (!formData.phone || !isValidPhoneNumber(formData.phone))
      e.phone = "A valid phone number is required";
    if (!formData.hasBasicKnowledge)
      e.hasBasicKnowledge =
        "Please indicate if you have basic knowledge of this program";
    if (!formData.knowledgeDescription || !formData.knowledgeDescription.trim())
      e.knowledgeDescription = "Please describe what you know (required)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!formData.program) e.program = "Please choose a program";
    if (!formData.startDate) e.startDate = "Please choose a start date";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Step navigation ───────────────────────────────────────────
  const goToNext = async () => {
    if (step === 1) {
      if (!validateStep1()) return;
      await saveDraft(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      await saveDraft(3);
    }
    setStep((s) => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToPrev = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Full submit ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const freshToken = RECAPTCHA_ENABLED
      ? (await executeRecaptcha?.(RECAPTCHA_ACTION))?.trim() || ""
      : "";

    if (RECAPTCHA_ENABLED && !freshToken) {
      setErrors((p) => ({ ...p, recaptcha: "Please verify you are human" }));
      return;
    }

    setLoading(true);
    try {
      const prog = visiblePrograms.find((p) => p.slug === formData.program);
      const payload = {
        full_name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        phone_country: formData.phone_country,
        has_basic_knowledge: formData.hasBasicKnowledge === "yes",
        knowledge_description: formData.knowledgeDescription?.trim() || "",
        program: formData.program,
        program_name: prog?.title || "Unknown Program",
        start_date: formData.startDate,
        payment_plan: formData.paymentPlan,
        estimated_fees: estimatedFees,
        message: formData.message?.trim() || "",
        status: "pending",
        source: "website",
      };

      const result = await applicationService.submitApplication({
        ...payload,
        recaptchaToken: freshToken,
      });
      if (result.success) {
        const prefill = location.state?.prefill;
        if (prefill?.uid) {
          try {
            await programService.enrollInProgram(formData.program, {
              program_id: formData.program,
              program_name: payload.program_name,
              start_date: formData.startDate,
              end_date: new Date(
                new Date(formData.startDate).getTime() +
                  (prog?.durationMonths || 3) * 30 * 86400000,
              ).toISOString(),
              amount: estimatedFees,
            });
            navigate(`/student-dashboard/${prefill.uid}`);
            return;
          } catch (err) {
            console.error(err);
          }
        }
        setApplicationData({ ...payload, id: result.data?.id });
        setShowSuccess(true);
      } else {
        throw new Error(result.error || "Failed to submit");
      }
    } catch (err) {
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <SuccessScreen
        data={applicationData}
        onHome={() => navigate("/")}
        onContact={() => navigate("/contact")}
      />
    );
  }

  const planNote =
    formData.paymentPlan === "full"
      ? "One-time payment — no surcharge (best value)"
      : formData.paymentPlan === "installment3"
        ? "Split into 3 equal instalments (20% surcharge)"
        : "Split into 2 equal instalments (10% surcharge)";

  const currentProgram = visiblePrograms.find(
    (p) => p.slug === formData.program,
  );
  const basePrice = currentProgram?.price ?? 0;
  const inst2Per = Math.round((basePrice * 1.1) / 2 / 500) * 500;
  const inst2Total = inst2Per * 2;
  const inst3Per = Math.round((basePrice * 1.2) / 3 / 500) * 500;
  const inst3Total = inst3Per * 3;

  const financeSummary =
    formData.paymentPlan === "full"
      ? {
          total: basePrice,
          per: basePrice,
          count: 1,
          label: "One-time payment",
          savings: inst3Total - basePrice,
          savingsLabel: "vs 3-instalment plan",
        }
      : formData.paymentPlan === "installment3"
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 space-y-10">
          {/* Page header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h1 className="font-semibold tracking-tight">
              Start Your <span className="text-primary">Tech Journey</span>
            </h1>
            <div className="w-16 h-0.5 bg-primary mx-auto" />
            <p className="text-muted-foreground py-1">
              Fill out the form below to apply for your chosen program.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center">
            <StepIndicator currentStep={step} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ── Form ── */}
            <div className="lg:col-span-8">
              <Card className="border border-border rounded-2xl">
                <CardContent className="p-6 sm:p-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* ── STEP 1: About You ── */}
                    {step === 1 && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold">
                            Personal Information
                          </h3>
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
                                  value={formData.fullName}
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
                                value={formData.email}
                                onChange={set("email")}
                                onBlur={handleEmailBlur}
                                disabled={loading}
                              />
                            </div>
                          </Field>
                          <Field
                            label="Phone Number"
                            required
                            error={errors.phone}
                          >
                            <div className="flex-1 relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <PhoneInput
                                country={formData.phone_country}
                                onCountryChange={(c) =>
                                  setFormData((p) => ({
                                    ...p,
                                    phone_country: c || "KE",
                                  }))
                                }
                                value={formData.phone}
                                onChange={(v) =>
                                  setFormData((p) => ({ ...p, phone: v }))
                                }
                                placeholder="Enter phone number"
                                international
                                defaultCountry="KE"
                                className="pl-9 w-full h-11 rounded-md border border-border bg-background text-sm"
                                disabled={loading}
                              />
                            </div>
                          </Field>
                          <div className="sm:col-span-2">
                            <Field
                              label="Do you have basic knowledge of the chosen program?"
                              required
                              error={errors.hasBasicKnowledge}
                            >
                              <Select
                                value={formData.hasBasicKnowledge}
                                onValueChange={(v) =>
                                  setFormData((p) => ({
                                    ...p,
                                    hasBasicKnowledge: v,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose yes or no" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No</SelectItem>
                                </SelectContent>
                              </Select>
                            </Field>
                          </div>
                          <div className="sm:col-span-2">
                            <Field
                              label="Please describe what basic knowledge you have"
                              required
                              error={errors.knowledgeDescription}
                            >
                              <Textarea
                                rows={4}
                                value={formData.knowledgeDescription}
                                onChange={(e) =>
                                  setFormData((p) => ({
                                    ...p,
                                    knowledgeDescription: e.target.value,
                                  }))
                                }
                                placeholder={
                                  !formData.hasBasicKnowledge
                                    ? "Choose yes or no first"
                                    : "Briefly describe what you know"
                                }
                                disabled={
                                  !formData.hasBasicKnowledge || loading
                                }
                              />
                            </Field>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 2: Program & Plan ── */}
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
                        ) : visiblePrograms.length === 0 ? (
                          <div className="text-center py-10 text-sm text-muted-foreground">
                            No programs available right now. Please check back
                            later.
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
                                    value={formData.program}
                                    onValueChange={set("program")}
                                    disabled={loading}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a program" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {visiblePrograms.map((p) => (
                                        <SelectItem key={p.slug} value={p.slug}>
                                          {p.title} — KSh{" "}
                                          {p.price != null
                                            ? p.price.toLocaleString()
                                            : "TBA"}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </Field>
                              </div>

                              <Field
                                label="Preferred Start Date"
                                required
                                error={errors.startDate}
                              >
                                <Select
                                  value={formData.startDate}
                                  onValueChange={set("startDate")}
                                  disabled={
                                    loading ||
                                    intakesLoading ||
                                    !formData.program
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue
                                      placeholder={
                                        !formData.program
                                          ? "Choose a program first"
                                          : intakesLoading
                                            ? "Loading dates…"
                                            : "Select a start date"
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {!formData.program ? (
                                      <SelectItem value="no-program" disabled>
                                        Choose a program first
                                      </SelectItem>
                                    ) : intakesLoading ? (
                                      <SelectItem value="loading" disabled>
                                        Loading…
                                      </SelectItem>
                                    ) : intakes.length === 0 ? (
                                      <SelectItem value="no-intakes" disabled>
                                        No upcoming intakes
                                      </SelectItem>
                                    ) : (
                                      intakes.map((intake) => (
                                        <SelectItem
                                          key={intake.id}
                                          value={intake.startDate}
                                        >
                                          {new Date(
                                            intake.startDate,
                                          ).toLocaleDateString("en-US", {
                                            weekday: "long",
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                          })}
                                          {intake.seatsRemaining != null && (
                                            <span className="ml-2 text-muted-foreground text-xs">
                                              ({intake.seatsRemaining} seats
                                              left)
                                            </span>
                                          )}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </Field>

                              <Field label="Payment Plan" required>
                                <Select
                                  value={formData.paymentPlan}
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
                            </div>

                            {/* Fee summary */}
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                  <Wallet className="w-4 h-4 text-primary" />{" "}
                                  Estimated Program Fees
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {planNote}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-3xl font-bold text-primary">
                                  KSh {financeSummary.total.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {financeSummary.count === 1
                                    ? "One-time"
                                    : `Total across ${financeSummary.count} instalments`}
                                </p>
                                <div className="mt-3 text-sm text-muted-foreground space-y-0.5">
                                  <div className="flex justify-between gap-8">
                                    <span>Plan</span>
                                    <span className="font-medium text-foreground">
                                      {financeSummary.label}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-8">
                                    <span>
                                      {financeSummary.count === 1
                                        ? "Amount due"
                                        : "Per instalment"}
                                    </span>
                                    <span className="font-medium text-foreground">
                                      KSh {financeSummary.per.toLocaleString()}
                                    </span>
                                  </div>
                                  {financeSummary.savings > 0 && (
                                    <div className="flex justify-between gap-8 text-green-600 font-semibold">
                                      <span>
                                        You save ({financeSummary.savingsLabel})
                                      </span>
                                      <span>
                                        KSh{" "}
                                        {financeSummary.savings.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── STEP 3: Review & Submit ── */}
                    {step === 3 && (
                      <div className="space-y-6">
                        {/* Summary */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold">
                              Application Summary
                            </h3>
                          </div>
                          <Separator />
                          <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border text-sm">
                            {[
                              { label: "Name", value: formData.fullName },
                              { label: "Email", value: formData.email },
                              { label: "Phone", value: formData.phone },
                              {
                                label: "Program",
                                value:
                                  visiblePrograms.find(
                                    (p) => p.slug === formData.program,
                                  )?.title || formData.program,
                              },
                              {
                                label: "Start Date",
                                value: formData.startDate
                                  ? new Date(
                                      formData.startDate,
                                    ).toLocaleDateString("en-US", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })
                                  : "—",
                              },
                              {
                                label: "Payment Plan",
                                value:
                                  PAYMENT_PLANS.find(
                                    (p) => p.id === formData.paymentPlan,
                                  )?.name || formData.paymentPlan,
                              },
                              {
                                label: "Estimated Fees",
                                value: `KSh ${financeSummary.total.toLocaleString()}`,
                              },
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

                        {/* Message */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <PenLine className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold">
                              Additional Details
                            </h3>
                          </div>
                          <Separator />
                          <Field label="Why do you want to join this program? (Optional)">
                            <Textarea
                              rows={4}
                              placeholder="Tell us about your goals and expectations..."
                              value={formData.message}
                              onChange={set("message")}
                              disabled={loading}
                              className="resize-none"
                            />
                          </Field>
                        </div>

                        {RECAPTCHA_ENABLED && (
                          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
                            <p>
                              Protected by reCAPTCHA v3. Verification runs
                              automatically when you submit.
                            </p>
                            {errors.recaptcha && (
                              <p className="flex items-center gap-1 text-destructive">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {errors.recaptcha}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <Separator />

                    {/* ── Navigation ── */}
                    <div className="flex gap-3">
                      {step > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={goToPrev}
                          disabled={loading}
                          className="flex-none w-28 h-11"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Back
                        </Button>
                      )}

                      {step < 3 ? (
                        <Button
                          type="button"
                          onClick={goToNext}
                          disabled={loading}
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-semibold"
                        >
                          Continue
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={loading}
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-base font-semibold"
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Processing Application...
                            </span>
                          ) : (
                            "Submit Application"
                          )}
                        </Button>
                      )}
                    </div>

                    {step === 3 && (
                      <p className="text-center text-xs text-muted-foreground -mt-4">
                        By submitting, you agree to our{" "}
                        <Link
                          to="/terms"
                          className="text-primary hover:underline"
                        >
                          Terms
                        </Link>{" "}
                        and{" "}
                        <Link
                          to="/privacy"
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
                  {[
                    { label: "Application review", value: "Under 2 hours" },
                    { label: "Admissions follow-up", value: "Under 24 hours" },
                    { label: "Final enrollment", value: "24–48 hours" },
                  ].map(({ label, value }) => (
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

              <Card className="border border-border rounded-2xl">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-semibold">Why Nexa?</h3>
                  <Separator />
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    {[
                      "Free dedicated application guidance",
                      "Clear payment plans and support",
                      "Program roadmap from industry mentors",
                      "Fast admissions process",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border border-border rounded-2xl">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold">Next Steps</h4>
                  </div>
                  <Separator />
                  <ol className="space-y-3 text-sm text-muted-foreground">
                    {[
                      "Our admissions team reviews your goals",
                      "Optional orientation call with a mentor",
                      "Final onboarding into the program group",
                    ].map((s, i) => (
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
      </main>

      <Footer />
    </div>
  );
};

const ApplicationPageWithRecaptcha = () => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  return <ApplicationPageContent executeRecaptcha={executeRecaptcha} />;
};

const ApplicationPage = () => {
  if (!RECAPTCHA_ENABLED) {
    return <ApplicationPageContent executeRecaptcha={null} />;
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
      <ApplicationPageWithRecaptcha />
    </GoogleReCaptchaProvider>
  );
};

export default ApplicationPage;
