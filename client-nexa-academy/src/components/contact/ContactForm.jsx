import { useState } from "react";
import apiService from "@/services/apiService";
import Field from "@/components/application/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, Phone } from "lucide-react";
import toast from "react-hot-toast";

const CONTACT_METHODS = ["email", "phone", "whatsapp"];

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    preferredContact: "email",
    phone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    const val = typeof e === "string" ? e : e.target.value;
    setFormData((p) => ({ ...p, [field]: val }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = "Name is required";
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email))
      e.email = "A valid email is required";
    if (!formData.subject.trim()) e.subject = "Subject is required";
    if (!formData.message.trim()) e.message = "Message is required";
    if (
      (formData.preferredContact === "phone" ||
        formData.preferredContact === "whatsapp") &&
      (!formData.phone || !isValidPhoneNumber(formData.phone))
    )
      e.phone = "A valid phone number is required for phone/WhatsApp contact";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await apiService.post("/messages/", {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        preferred_contact: formData.preferredContact,
        phone: formData.phone,
        message: formData.message,
      });
      toast.success("Message sent successfully — we'll get back to you soon.");
      setFormData({
        name: "",
        email: "",
        subject: "",
        preferredContact: "email",
        phone: "",
        message: "",
      });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      toast.error("There was an error sending your message. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-border rounded-2xl">
      <CardContent className="p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h3 className="font-semibold">Send us a Message</h3>
          <p className="text-sm text-muted-foreground">
            We'll respond within 24 hours
          </p>
        </div>

        <Separator />

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Your Name" required error={errors.name}>
              <Input
                placeholder="John Doe"
                value={formData.name}
                onChange={set("name")}
                disabled={loading}
              />
            </Field>
            <Field label="Email Address" required error={errors.email}>
              <Input
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={set("email")}
                disabled={loading}
              />
            </Field>
          </div>

          <Field label="Subject" required error={errors.subject}>
            <Input
              placeholder="How can we help you?"
              value={formData.subject}
              onChange={set("subject")}
              disabled={loading}
            />
          </Field>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Preferred Contact Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              {CONTACT_METHODS.map((method) => (
                <label
                  key={method}
                  className={`flex items-center gap-2 border rounded-xl px-4 py-3 cursor-pointer transition-colors text-sm font-medium capitalize ${
                    formData.preferredContact === method
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="preferredContact"
                    value={method}
                    checked={formData.preferredContact === method}
                    onChange={set("preferredContact")}
                    className="accent-primary sr-only"
                  />
                  {method}
                </label>
              ))}
            </div>
          </div>

          {(formData.preferredContact === "phone" ||
            formData.preferredContact === "whatsapp") && (
            <Field label="Phone Number" required error={errors.phone}>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <PhoneInput
                  international
                  defaultCountry="KE"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(v) => setFormData((p) => ({ ...p, phone: v }))}
                  className="pl-9 w-full h-11 rounded-md border border-border bg-background text-sm"
                  disabled={loading}
                />
              </div>
            </Field>
          )}

          <Field label="Your Message" required error={errors.message}>
            <Textarea
              rows={6}
              placeholder="Tell us about your inquiry..."
              value={formData.message}
              onChange={set("message")}
              disabled={loading}
              className="resize-none"
            />
          </Field>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-base font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending Message...
              </span>
            ) : (
              "Send Message"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
