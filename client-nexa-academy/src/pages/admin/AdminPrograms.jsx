import { createElement, useEffect, useState, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageUpload from "@/components/admin/ImageUpload";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertCircle,
  GripVertical,
} from "lucide-react";
import * as LucideIconSet from "lucide-react";
import {
  FaReact,
  FaNodeJs,
  FaPython,
  FaJava,
  FaAws,
  FaDocker,
  FaDatabase,
  FaCloud,
  FaMobileAlt,
  FaShieldAlt,
  FaChartLine,
  FaRobot,
} from "react-icons/fa";
import toast from "react-hot-toast";
import apiService from "@/services/apiService";

// ── colour helpers ─────────────────────────────────────────────
const statusColor = {
  active: "bg-green-100 text-green-700",
  draft: "bg-amber-100 text-amber-700",
  archived: "bg-gray-100 text-gray-500",
};
const intakeStatusColor = {
  open: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
  draft: "bg-amber-100 text-amber-700",
};

const FEATURE_LUCIDE_ICON_OPTIONS = [
  "Code2",
  "Terminal",
  "Globe",
  "Cloud",
  "Database",
  "Cpu",
  "ShieldCheck",
  "Rocket",
  "Briefcase",
  "LineChart",
  "Monitor",
  "Smartphone",
];

const FEATURE_FA_ICON_MAP = {
  FaReact,
  FaNodeJs,
  FaPython,
  FaJava,
  FaAws,
  FaDocker,
  FaDatabase,
  FaCloud,
  FaMobileAlt,
  FaShieldAlt,
  FaChartLine,
  FaRobot,
};

const FEATURE_FA_ICON_OPTIONS = Object.keys(FEATURE_FA_ICON_MAP);

const isRemoteImage = (value) => /^https?:\/\//i.test(value || "");

const resolveFeatureIconComponent = (iconValue) => {
  if (!iconValue || isRemoteImage(iconValue)) return null;
  if (iconValue.startsWith("lucide:")) {
    const name = iconValue.replace("lucide:", "");
    return LucideIconSet[name] || null;
  }
  if (iconValue.startsWith("fa:")) {
    const name = iconValue.replace("fa:", "");
    return FEATURE_FA_ICON_MAP[name] || null;
  }
  // Backward compatibility with existing plain icon names in saved data.
  return LucideIconSet[iconValue] || FEATURE_FA_ICON_MAP[iconValue] || null;
};

const renderResolvedFeatureIcon = (iconValue, className) => {
  const IconComponent = resolveFeatureIconComponent(iconValue);
  if (!IconComponent) return null;
  return createElement(IconComponent, { className });
};

function FeatureIconPreview({ iconValue }) {
  if (!iconValue) {
    return (
      <div className="w-9 h-9 rounded-lg bg-muted/40 border border-border flex items-center justify-center">
        <LucideIconSet.ImageIcon className="w-4 h-4 text-muted-foreground/50" />
      </div>
    );
  }

  if (isRemoteImage(iconValue)) {
    return (
      <img
        src={iconValue}
        alt="feature icon"
        className="w-9 h-9 rounded-lg object-cover border border-border"
      />
    );
  }

  const iconNode = renderResolvedFeatureIcon(iconValue, "w-4 h-4 text-primary");
  if (!iconNode) {
    return (
      <div className="w-9 h-9 rounded-lg bg-muted/40 border border-border flex items-center justify-center text-[10px] text-muted-foreground font-mono">
        ?
      </div>
    );
  }

  return (
    <div className="w-9 h-9 rounded-lg bg-muted/40 border border-border flex items-center justify-center">
      {iconNode}
    </div>
  );
}

// ── reusable list-editor primitives ───────────────────────────

/** Single string list (outcomes) */
function StringListEditor({
  label,
  value = [],
  onChange,
  placeholder = "Add item…",
}) {
  const add = () => onChange([...value, ""]);
  const update = (i, v) => {
    const n = [...value];
    n[i] = v;
    onChange(n);
  };
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            <Input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="text-xs"
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> Add item
      </Button>
    </div>
  );
}

/** Topics: [{name, icon}] */
function TopicsEditor({ value = [], onChange }) {
  const add = () => onChange([...value, { name: "", icon: "" }]);
  const update = (i, field, v) => {
    const n = [...value];
    n[i] = { ...n[i], [field]: v };
    onChange(n);
  };
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      <Label>Topics</Label>
      <div className="space-y-2">
        {value.map((t, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-muted/20 p-3 space-y-3"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              <Input
                value={t.name}
                onChange={(e) => update(i, "name", e.target.value)}
                placeholder="Topic name"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="pl-6">
              <ImageUpload
                label="Icon"
                aspectHint="square, 1:1"
                folder="nexa/program-topic-icons"
                value={t.icon}
                onChange={(url) => update(i, "icon", url)}
              />
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="text-xs"
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> Add topic
      </Button>
    </div>
  );
}

/** Features: [{icon, title, desc}] */
function FeaturesEditor({ value = [], onChange }) {
  const add = () => onChange([...value, { icon: "", title: "", desc: "" }]);
  const update = (i, field, v) => {
    const n = [...value];
    n[i] = { ...n[i], [field]: v };
    onChange(n);
  };
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      <Label>Features / Highlights</Label>
      <div className="space-y-3">
        {value.map((f, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-muted/20 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Feature {i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
              <FeatureIconPreview iconValue={f.icon} />
              <div className="space-y-2">
                <Input
                  value={f.title}
                  onChange={(e) => update(i, "title", e.target.value)}
                  placeholder="Title"
                />

                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={f.icon?.startsWith("lucide:") ? f.icon : ""}
                    onValueChange={(v) => update(i, "icon", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose Lucide icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {FEATURE_LUCIDE_ICON_OPTIONS.map((name) => (
                        <SelectItem key={name} value={`lucide:${name}`}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={f.icon?.startsWith("fa:") ? f.icon : ""}
                    onValueChange={(v) => update(i, "icon", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose React FA icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {FEATURE_FA_ICON_OPTIONS.map((name) => (
                        <SelectItem key={name} value={`fa:${name}`}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-1">
                  <ImageUpload
                    label="Or upload custom icon"
                    aspectHint="square, 1:1"
                    folder="nexa/program-feature-icons"
                    value={isRemoteImage(f.icon) ? f.icon : ""}
                    onChange={(url) => update(i, "icon", url)}
                  />
                </div>

                {f.icon && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => update(i, "icon", "")}
                  >
                    Clear icon
                  </Button>
                )}
              </div>
            </div>
            <Input
              value={f.desc}
              onChange={(e) => update(i, "desc", e.target.value)}
              placeholder="Short description"
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="text-xs"
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> Add feature
      </Button>
    </div>
  );
}

/** Curriculum: [{phase, title, weeks, topics:[], project}] */
function CurriculumEditor({ value = [], onChange }) {
  const add = () =>
    onChange([
      ...value,
      { phase: "", title: "", weeks: "", topics: [], project: "" },
    ]);
  const update = (i, field, v) => {
    const n = [...value];
    n[i] = { ...n[i], [field]: v };
    onChange(n);
  };
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  const addTopic = (i) => {
    const n = [...value];
    n[i] = { ...n[i], topics: [...(n[i].topics || []), ""] };
    onChange(n);
  };
  const updateTopic = (i, ti, v) => {
    const n = [...value];
    const topics = [...(n[i].topics || [])];
    topics[ti] = v;
    n[i] = { ...n[i], topics };
    onChange(n);
  };
  const removeTopic = (i, ti) => {
    const n = [...value];
    n[i] = {
      ...n[i],
      topics: (n[i].topics || []).filter((_, idx) => idx !== ti),
    };
    onChange(n);
  };

  return (
    <div className="space-y-2">
      <Label>Curriculum</Label>
      <div className="space-y-4">
        {value.map((phase, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-muted/10 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">
                Phase {i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={phase.phase}
                onChange={(e) => update(i, "phase", e.target.value)}
                placeholder="e.g. Month 1"
              />
              <Input
                value={phase.title}
                onChange={(e) => update(i, "title", e.target.value)}
                placeholder="Phase title"
                className="col-span-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={phase.weeks}
                onChange={(e) => update(i, "weeks", e.target.value)}
                placeholder="e.g. 4 weeks"
              />
              <Input
                value={phase.project || ""}
                onChange={(e) => update(i, "project", e.target.value)}
                placeholder="Capstone / project"
              />
            </div>
            {/* Topics sub-list */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Topics
              </span>
              <div className="space-y-1.5 pl-2">
                {(phase.topics || []).map((t, ti) => (
                  <div key={ti} className="flex items-center gap-2">
                    <span className="text-muted-foreground/40 text-xs">—</span>
                    <Input
                      value={t}
                      onChange={(e) => updateTopic(i, ti, e.target.value)}
                      placeholder="Topic description"
                      className="flex-1 h-8 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeTopic(i, ti)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addTopic(i)}
                className="text-xs h-7 pl-2"
              >
                <Plus className="w-3 h-3 mr-1" /> Add topic
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="text-xs"
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> Add phase
      </Button>
    </div>
  );
}

/** FAQ: [{question, answer}] */
function FaqEditor({ value = [], onChange }) {
  const add = () => onChange([...value, { question: "", answer: "" }]);
  const update = (i, field, v) => {
    const n = [...value];
    n[i] = { ...n[i], [field]: v };
    onChange(n);
  };
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      <Label>FAQ</Label>
      <div className="space-y-3">
        {value.map((faq, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-muted/20 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Q{i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Input
              value={faq.question}
              onChange={(e) => update(i, "question", e.target.value)}
              placeholder="Question"
            />
            <Textarea
              rows={2}
              value={faq.answer}
              onChange={(e) => update(i, "answer", e.target.value)}
              placeholder="Answer"
              className="resize-none"
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="text-xs"
      >
        <Plus className="w-3.5 h-3.5 mr-1" /> Add FAQ
      </Button>
    </div>
  );
}

// ── blank forms ────────────────────────────────────────────────
const BLANK_PROGRAM = {
  program_name: "",
  slug: "",
  subtitle: "",
  description: "",
  level: "Beginner",
  category: "",
  price: "",
  original_price: "",
  duration_months: "",
  duration: "",
  icon: "",
  image: "",
  instructor: "",
  instructor_email: "",
  status: "draft",
  coming_soon: false,
  topics: [],
  features: [],
  curriculum: [],
  outcomes: [],
  faq: [],
};
const BLANK_INTAKE = {
  program: "",
  start_date: "",
  end_date: "",
  application_deadline: "",
  max_seats: "",
  seats_remaining: "",
  status: "draft",
  notes: "",
};

// ── ProgramForm drawer ─────────────────────────────────────────
function ProgramForm({ initial, programs, onSave, onClose }) {
  const isEdit = Boolean(initial?.program_id);
  const [form, setForm] = useState(() =>
    initial
      ? {
          ...BLANK_PROGRAM,
          ...initial,
          price: initial.price ?? "",
          original_price: initial.original_price ?? "",
          duration_months: initial.duration_months ?? "",
          duration: initial.duration ?? "",
          coming_soon: Boolean(initial.coming_soon),
          topics: initial.topics || [],
          features: initial.features || [],
          curriculum: initial.curriculum || [],
          outcomes: initial.outcomes || [],
          faq: initial.faq || [],
        }
      : BLANK_PROGRAM,
  );
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("basic");

  const set = (field) => (val) => {
    const v = val?.target ? val.target.value : val;
    setForm((p) => ({ ...p, [field]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.program_name.trim()) {
      toast.error("Program name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        program_name: form.program_name.trim(),
        slug: form.slug.trim() || undefined,
        subtitle: form.subtitle,
        description: form.description,
        level: form.level,
        category: form.category,
        price: form.price !== "" ? Number(form.price) : null,
        original_price:
          form.original_price !== "" ? Number(form.original_price) : null,
        duration_months:
          form.duration_months !== "" ? Number(form.duration_months) : null,
        duration: form.duration !== "" ? Number(form.duration) : null,
        icon: form.icon,
        image: form.image,
        instructor: form.instructor,
        instructor_email: form.instructor_email,
        status: form.status,
        coming_soon: form.coming_soon,
        topics: form.topics,
        features: form.features,
        curriculum: form.curriculum,
        outcomes: form.outcomes,
        faq: form.faq,
      };
      const result = isEdit
        ? await apiService.patch(`/programs/${initial.program_id}/`, payload)
        : await apiService.post("/programs/", payload);
      toast.success(
        isEdit
          ? "Program updated — synced to Sanity"
          : "Program created — synced to Sanity",
      );
      onSave(result);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-background shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Program" : "New Program"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="border-b shrink-0 px-6">
          <div className="flex gap-1 -mb-px">
            {["basic", "media", "content", "faq"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "faq"
                  ? "FAQ"
                  : t === "basic"
                    ? "Basics"
                    : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* ── BASICS TAB ── */}
            {tab === "basic" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Program Name *</Label>
                    <Input
                      value={form.program_name}
                      onChange={set("program_name")}
                      placeholder="e.g. Software Engineering"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Slug</Label>
                    <Input
                      value={form.slug}
                      onChange={set("slug")}
                      placeholder="software-engineering"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Level</Label>
                    <Select value={form.level} onValueChange={set("level")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">
                          Intermediate
                        </SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Subtitle</Label>
                    <Input
                      value={form.subtitle}
                      onChange={set("subtitle")}
                      placeholder="Short tagline shown below the title"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Description</Label>
                    <Textarea
                      rows={3}
                      value={form.description}
                      onChange={set("description")}
                      className="resize-none"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Price (KSh)</Label>
                    <Input
                      type="number"
                      value={form.price}
                      onChange={set("price")}
                      placeholder="150000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Original Price (KSh)</Label>
                    <Input
                      type="number"
                      value={form.original_price}
                      onChange={set("original_price")}
                      placeholder="175000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duration (months)</Label>
                    <Input
                      type="number"
                      value={form.duration_months}
                      onChange={set("duration_months")}
                      placeholder="6"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duration (weeks)</Label>
                    <Input
                      type="number"
                      value={form.duration}
                      onChange={set("duration")}
                      placeholder="24"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Instructor</Label>
                    <Input
                      value={form.instructor}
                      onChange={set("instructor")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Instructor Email</Label>
                    <Input
                      type="email"
                      value={form.instructor_email}
                      onChange={set("instructor_email")}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex gap-6 items-start">
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={set("status")}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-7">
                    <input
                      type="checkbox"
                      checked={form.coming_soon}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          coming_soon: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Coming Soon</span>
                  </label>
                </div>
              </>
            )}

            {/* ── MEDIA TAB ── */}
            {tab === "media" && (
              <div className="space-y-6">
                <ImageUpload
                  label="Hero / Banner Image"
                  aspectHint="16:9 recommended"
                  folder="nexa/programs"
                  value={form.image}
                  onChange={(url) => setForm((p) => ({ ...p, image: url }))}
                />
                <ImageUpload
                  label="Program Icon"
                  aspectHint="square, 1:1"
                  folder="nexa/program-icons"
                  value={form.icon}
                  onChange={(url) => setForm((p) => ({ ...p, icon: url }))}
                />
              </div>
            )}

            {/* ── CONTENT TAB ── */}
            {tab === "content" && (
              <div className="space-y-8">
                <TopicsEditor
                  value={form.topics}
                  onChange={(v) => setForm((p) => ({ ...p, topics: v }))}
                />
                <Separator />
                <FeaturesEditor
                  value={form.features}
                  onChange={(v) => setForm((p) => ({ ...p, features: v }))}
                />
                <Separator />
                <CurriculumEditor
                  value={form.curriculum}
                  onChange={(v) => setForm((p) => ({ ...p, curriculum: v }))}
                />
                <Separator />
                <StringListEditor
                  label="Learning Outcomes"
                  value={form.outcomes}
                  onChange={(v) => setForm((p) => ({ ...p, outcomes: v }))}
                  placeholder="e.g. Build responsive React applications"
                />
              </div>
            )}

            {/* ── FAQ TAB ── */}
            {tab === "faq" && (
              <FaqEditor
                value={form.faq}
                onChange={(v) => setForm((p) => ({ ...p, faq: v }))}
              />
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary text-primary-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {isEdit ? "Save Changes" : "Create Program"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── IntakeForm drawer ──────────────────────────────────────────
function IntakeForm({ initial, programs, onSave, onClose }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(() => ({
    ...BLANK_INTAKE,
    ...(initial || {}),
    program: initial?.program ?? "",
    max_seats: initial?.max_seats ?? "",
    seats_remaining: initial?.seats_remaining ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const requiresProgramSelection = !isEdit && !form.program;

  const set = (field) => (e) => {
    const val = e?.target ? e.target.value : e;
    setForm((p) => ({ ...p, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.program) {
      toast.error("Select a program");
      return;
    }
    if (!form.start_date) {
      toast.error("Start date is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        program: form.program,
        start_date: form.start_date,
        end_date: form.end_date || null,
        application_deadline: form.application_deadline || null,
        max_seats: form.max_seats !== "" ? Number(form.max_seats) : null,
        seats_remaining:
          form.seats_remaining !== "" ? Number(form.seats_remaining) : null,
        status: form.status,
        notes: form.notes,
      };
      const result = isEdit
        ? await apiService.patch(`/intakes/${initial.id}/`, payload)
        : await apiService.post("/intakes/", payload);
      toast.success(
        isEdit
          ? "Intake updated — synced to Sanity"
          : "Intake created — synced to Sanity",
      );
      onSave(result);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg bg-background shadow-xl flex flex-col h-full overflow-y-auto">
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Intake" : "New Intake"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-5">
          <div className="space-y-1.5">
            <Label>Program *</Label>
            <Select
              value={String(form.program)}
              onValueChange={set("program")}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.program_id} value={p.program_id}>
                    {p.program_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isEdit && !form.program && (
              <p className="text-xs text-muted-foreground">
                Choose a program before filling intake details.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={set("start_date")}
                disabled={requiresProgramSelection}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={set("end_date")}
                disabled={requiresProgramSelection}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Application Deadline</Label>
              <Input
                type="date"
                value={form.application_deadline}
                onChange={set("application_deadline")}
                disabled={requiresProgramSelection}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={set("status")}
                disabled={requiresProgramSelection}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Max Seats</Label>
              <Input
                type="number"
                value={form.max_seats}
                onChange={set("max_seats")}
                placeholder="20"
                disabled={requiresProgramSelection}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Seats Remaining</Label>
              <Input
                type="number"
                value={form.seats_remaining}
                onChange={set("seats_remaining")}
                placeholder="20"
                disabled={requiresProgramSelection}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={set("notes")}
              className="resize-none"
              placeholder={
                requiresProgramSelection
                  ? "Choose a program first"
                  : "Optional notes"
              }
              disabled={requiresProgramSelection}
            />
          </div>
          <div className="pt-2 flex gap-3 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || requiresProgramSelection}
              className="flex-1 bg-primary text-primary-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {isEdit ? "Save Changes" : "Create Intake"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────
function ConfirmDelete({ label, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-background rounded-2xl border border-border p-6 max-w-sm w-full space-y-4 shadow-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Delete {label}?</p>
            <p className="text-sm text-muted-foreground mt-1">
              This will also remove it from Sanity. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-destructive text-white hover:bg-destructive/90"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Programs tab ───────────────────────────────────────────────
function ProgramsTab({ programs, loading, onRefresh }) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expanded, setExpanded] = useState({});

  const filtered = programs.filter((p) =>
    p.program_name?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSave = () => {
    setFormOpen(false);
    setEditTarget(null);
    onRefresh();
  };

  const handleDelete = async () => {
    try {
      await apiService.delete(`/programs/${deleteTarget.program_id}/`);
      toast.success("Program deleted");
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    }
  };

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search programs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
          className="bg-primary text-primary-foreground ml-auto"
        >
          <Plus className="w-4 h-4 mr-1" /> New Program
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No programs found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.program_id} className="border rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {p.icon ? (
                    <img
                      src={p.icon}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{p.program_name}</span>
                      <Badge
                        className={`text-xs border-0 ${statusColor[p.status] || "bg-muted/10 text-muted-foreground"}`}
                      >
                        {p.status}
                      </Badge>
                      {p.coming_soon && (
                        <Badge className="text-xs border-0 bg-blue-100 text-blue-700">
                          Coming Soon
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                      {p.slug && <span className="font-mono">/{p.slug}</span>}
                      {p.price != null && (
                        <span>KSh {Number(p.price).toLocaleString()}</span>
                      )}
                      {p.duration_months && (
                        <span>{p.duration_months} months</span>
                      )}
                      {p.level && <span>{p.level}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpand(p.program_id)}
                      className="h-8 w-8 p-0"
                    >
                      {expanded[p.program_id] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditTarget(p);
                        setFormOpen(true);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(p)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {expanded[p.program_id] && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    {p.image && (
                      <img
                        src={p.image}
                        alt="hero"
                        className="w-full h-28 object-cover rounded-xl"
                      />
                    )}
                    {p.subtitle && (
                      <p className="text-sm font-medium">{p.subtitle}</p>
                    )}
                    {p.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {p.description}
                      </p>
                    )}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{(p.topics || []).length} topics</span>
                      <span>{(p.curriculum || []).length} phases</span>
                      <span>{(p.features || []).length} features</span>
                      <span>{(p.faq || []).length} FAQs</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/50 font-mono">
                      Sanity: {p.sanity_id || "not yet synced"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {formOpen && (
        <ProgramForm
          initial={editTarget}
          programs={programs}
          onSave={handleSave}
          onClose={() => {
            setFormOpen(false);
            setEditTarget(null);
          }}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          label={deleteTarget.program_name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ── Intakes tab ────────────────────────────────────────────────
function IntakesTab({ programs, loading }) {
  const [intakes, setIntakes] = useState([]);
  const [intakesLoading, setIntakesLoading] = useState(true);
  const [programFilter, setProgramFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadIntakes = useCallback(async () => {
    setIntakesLoading(true);
    try {
      const res = await apiService.get("/intakes/");
      setIntakes(res.results || res || []);
    } catch {
      /* ignore */
    }
    setIntakesLoading(false);
  }, []);

  useEffect(() => {
    loadIntakes();
  }, [loadIntakes]);

  const handleSave = () => {
    setFormOpen(false);
    setEditTarget(null);
    loadIntakes();
  };
  const handleDelete = async () => {
    try {
      await apiService.delete(`/intakes/${deleteTarget.id}/`);
      toast.success("Intake deleted");
      setDeleteTarget(null);
      loadIntakes();
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    }
  };

  const programMap = Object.fromEntries(
    programs.map((p) => [p.program_id, p.program_name]),
  );
  const filtered =
    programFilter === "all"
      ? intakes
      : intakes.filter((i) => i.program === programFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programs</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.program_id} value={p.program_id}>
                {p.program_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
          className="bg-primary text-primary-foreground ml-auto"
        >
          <Plus className="w-4 h-4 mr-1" /> New Intake
        </Button>
      </div>

      {intakesLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No intakes found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((intake) => (
            <Card key={intake.id} className="border rounded-2xl">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">
                      {programMap[intake.program] ||
                        intake.program_name ||
                        "Unknown program"}
                    </span>
                    <Badge
                      className={`text-xs border-0 ${intakeStatusColor[intake.status] || "bg-muted/10"}`}
                    >
                      {intake.status}
                    </Badge>
                    {intake.source === "cms" && (
                      <Badge className="text-xs border-0 bg-purple-100 text-purple-700">
                        Sanity
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>Starts: {intake.start_date}</span>
                    {intake.application_deadline && (
                      <span>Deadline: {intake.application_deadline}</span>
                    )}
                    {intake.end_date && <span>Ends: {intake.end_date}</span>}
                    {intake.seats_remaining != null && (
                      <span
                        className={
                          intake.seats_remaining <= 5
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        {intake.seats_remaining} seats left
                      </span>
                    )}
                  </div>
                  {intake.notes && (
                    <p className="text-xs text-muted-foreground italic">
                      {intake.notes}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditTarget(intake);
                      setFormOpen(true);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(intake)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {formOpen && (
        <IntakeForm
          initial={editTarget}
          programs={programs}
          onSave={handleSave}
          onClose={() => {
            setFormOpen(false);
            setEditTarget(null);
          }}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          label={`intake starting ${deleteTarget.start_date}`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
const AdminPrograms = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.get("/programs/");
      setPrograms(res.results || res || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Programs & Intakes</h1>
            <p className="text-sm text-muted-foreground">
              Changes sync automatically to Sanity CMS
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPrograms}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="programs">
          <TabsList>
            <TabsTrigger value="programs">
              <BookOpen className="w-4 h-4 mr-1.5" /> Programs
            </TabsTrigger>
            <TabsTrigger value="intakes">
              <CalendarDays className="w-4 h-4 mr-1.5" /> Intakes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="programs" className="mt-6">
            <ProgramsTab
              programs={programs}
              loading={loading}
              onRefresh={loadPrograms}
            />
          </TabsContent>
          <TabsContent value="intakes" className="mt-6">
            <IntakesTab
              programs={programs}
              loading={loading}
              onRefresh={loadPrograms}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminPrograms;
