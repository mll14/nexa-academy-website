import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Clock, BadgeCheck, Users, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
// import apiService from "@/services/apiService";
import apiConfig from "@/utils/apiConfig";
import toast from "react-hot-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ProgramCard({
  program,
  compareIds,
  onCompareToggle,
  isCompareMode,
}) {
  const selected = compareIds.includes(program.id);
  const seats = program.seatsRemaining;
  const seatsColor =
    seats != null && seats <= 5
      ? "bg-red-100 text-red-700"
      : seats != null && seats <= 10
        ? "bg-amber-100 text-amber-700"
        : "bg-green-100 text-green-700";

  return (
    <Card
      className={`relative border rounded-2xl bg-background h-full flex flex-col transition-all ${isCompareMode && selected ? "border-primary ring-1 ring-primary" : "border-border"}`}
    >
      {isCompareMode && (
        <button
          onClick={() => onCompareToggle(program.id)}
          className={`absolute top-3 right-3 z-10 text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
            selected
              ? "bg-primary text-white border-primary"
              : "bg-background text-foreground border-border hover:border-primary"
          }`}
        >
          {selected ? "Selected" : "Compare"}
        </button>
      )}

      <CardContent className="p-5 sm:p-6 flex flex-col gap-4 h-full">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            {program.icon && (
              <img
                src={program.icon}
                alt="icon"
                className="w-8 h-8 rounded-md bg-white/5 p-1"
              />
            )}
            <h3 className="text-base sm:text-lg font-semibold">
              {program.title}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {program.description}
          </p>
        </div>

        {/* {program.topics && (
          <div className="mt-3 flex flex-wrap gap-2">
            {program.topics.map((t) => (
              <div
                key={t.name}
                className="flex items-center gap-2 bg-muted/20 px-3 py-1 rounded-full text-xs"
              >
                <img src={t.icon} alt={t.name} className="w-4 h-4" />
                <span>{t.name}</span>
              </div>
            ))}
          </div>
        )} */}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {program.duration}
          </span>
          <span className="flex items-center gap-1">
            <BadgeCheck className="w-3.5 h-3.5" />
            {program.level}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {program.students} graduates
          </span>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> Next: {program.nextIntake}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> Deadline:{" "}
            {program.applicationDeadline}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          {seats != null ? (
            <Badge className={`text-xs border-0 ${seatsColor}`}>
              {seats} seats left
            </Badge>
          ) : (
            <Badge className="text-xs border-0 bg-green-100 text-green-700">
              Applications open
            </Badge>
          )}
          <div className="flex gap-2">
            {program.comingSoon ? (
              <>
                <Badge className="text-xs bg-muted/10">Coming Soon</Badge>
                <ExpressInterestButton program={program} />
              </>
            ) : (
              <>
                <Link
                  to={`/programs/${program.slug}`}
                  className="inline-flex items-center justify-center rounded-md border border-primary text-primary hover:bg-primary hover:text-white h-8 px-2.5 text-xs font-medium transition-colors"
                >
                  Learn More
                </Link>
                <Link
                  to="/apply"
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-2.5 text-xs font-medium transition-colors"
                >
                  Apply Now
                </Link>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
      // Use a non-authenticated POST for public interest submissions to avoid 401s
      const res = await fetch(`${apiConfig.baseURL}/programs/interest/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // explicitly omit credentials so no cookies/Authorization are sent
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
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
      >
        Express interest
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="max-w-md w-full mx-auto z-50">
            <div className="bg-background border rounded-lg p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">
                  Express interest — {program.title}
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground"
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
        </div>
      )}
    </>
  );
}
