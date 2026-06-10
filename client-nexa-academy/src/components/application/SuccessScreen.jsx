import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  FaWhatsapp,
  FaTelegramPlane,
  FaDiscord,
  FaLinkedinIn,
} from "react-icons/fa";
import { Header } from "@/components/sections/landing-page/header";
import { Footer } from "@/components/sections/landing-page/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import PostSubmitAuth from "@/components/application/PostSubmitAuth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function SuccessScreen({ data, onHome, onContact }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showAuthPanel, setShowAuthPanel] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const community = [
    {
      icon: FaWhatsapp,
      label: "WhatsApp",
      sub: "Student Group",
      href: "https://chat.whatsapp.com/your-group-link",
      color: "text-green-600 bg-green-100",
    },
    {
      icon: FaTelegramPlane,
      label: "Telegram",
      sub: "Updates",
      href: "https://t.me/nexaacademy",
      color: "text-sky-600 bg-sky-100",
    },
    {
      icon: FaDiscord,
      label: "Discord",
      sub: "Community",
      href: "https://discord.gg/nexaacademy",
      color: "text-indigo-600 bg-indigo-100",
    },
    {
      icon: FaLinkedinIn,
      label: "LinkedIn",
      sub: "Network",
      href: "https://linkedin.com/company/nexaacademy",
      color: "text-blue-600 bg-blue-100",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl space-y-8 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold">
              Application Submitted!
            </h1>
            <p className="text-muted-foreground">
              We've received your application and will review it within 24–48
              hours.
            </p>
          </div>

          {data && (
            <Card className="border border-border rounded-2xl text-left">
              <CardContent className="p-5 sm:p-7 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Application
                  Summary
                </h3>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Application ID
                    </p>
                    <p className="font-mono font-bold text-primary">
                      {data.id || "Pending"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Program</p>
                    <p className="font-semibold">{data.program_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Estimated Fees
                    </p>
                    <p className="font-bold text-lg text-primary">
                      KSh {data.estimated_fees?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Start Date</p>
                    <p>
                      {new Date(data.start_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Offer quick account creation for unauthenticated applicants */}
          {!currentUser && showAuthPanel && (
            <div>
              <PostSubmitAuth
                prefillEmail={data?.email}
                onSuccess={(uid) => navigate(`/student-dashboard/${uid}`)}
                onSkip={() => setShowAuthPanel(false)}
              />
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium">Join our community</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {community.map((item) => {
                const IconComponent = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary transition-colors text-center"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.sub}
                    </p>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onHome}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Return to Homepage
            </Button>
            <Button
              onClick={onContact}
              variant="outline"
              className="flex-1 border-primary text-primary hover:bg-primary hover:text-white"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
