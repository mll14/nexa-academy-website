import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { Header } from "@/components/sections/landing-page/header";
import { Footer } from "@/components/sections/landing-page/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Mail, Lock, LogIn, Phone, User } from "lucide-react";
import { setSeoData } from "../../utils/seoUtils";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());

const GoogleSignInButton = ({ onSuccess, onError, disabled }) => {
  const login = useGoogleLogin({ onSuccess, onError, flow: "implicit" });
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={() => login()}
      className="w-full h-11 gap-3 border border-border hover:bg-muted/50"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Continue with Google
    </Button>
  );
};

export default function StudentLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signUp, googleLogin } = useAuth();

  const [activeTab, setActiveTab] = useState("signin");
  const [signin, setSignin] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => setSeoData("login"), []);

  const setSigninField = (f) => (e) =>
    setSignin((p) => ({ ...p, [f]: e.target.value }));
  const setSignupField = (f) => (e) =>
    setSignup((p) => ({ ...p, [f]: e.target.value }));

  const redirectAfterLogin = useCallback(
    (user) => {
      const uid = user?.uid || user?.id;
      const from =
        location.state?.from?.pathname || `/student-dashboard/${uid}`;
      navigate(from, { replace: true });
    },
    [location.state?.from?.pathname, navigate],
  );

  const validateSignin = () => {
    const e = {};
    if (!signin.email.trim() || !/\S+@\S+\.\S+/.test(signin.email))
      e.email = "A valid email is required";
    if (!signin.password.trim() || signin.password.length < 6)
      e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignin = async (ev) => {
    ev.preventDefault();
    if (!validateSignin()) return;
    setLoading(true);
    try {
      const result = await login(signin.email, signin.password);
      if (result.success) {
        toast.success("Welcome back!");
        redirectAfterLogin(result.user);
      } else {
        toast.error("Sign in failed. Please check your credentials.");
      }
    } catch {
      toast.error("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const validateSignup = () => {
    const e = {};
    if (!signup.fullName.trim() || signup.fullName.trim().length < 2)
      e.fullName = "Full name required";
    if (!signup.email.trim() || !/\S+@\S+\.\S+/.test(signup.email))
      e.email = "A valid email is required";
    if (!signup.password || signup.password.length < 6)
      e.password = "Password must be at least 6 characters";
    if (signup.password !== signup.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async (ev) => {
    ev.preventDefault();
    if (!validateSignup()) return;
    setLoading(true);
    try {
      const payload = {
        email: signup.email.trim(),
        password: signup.password.trim(),
        display_name: signup.fullName.trim(),
        phone: signup.phone.trim(),
      };
      const result = await signUp(payload);
      if (result.success) {
        toast.success("Account created — redirecting...");
        redirectAfterLogin(result.user);
      } else {
        toast.error("Sign up failed. Please try again.");
      }
    } catch {
      toast.error("Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSuccess = useCallback(
    async (tokenResponse) => {
      setGoogleLoading(true);
      setErrors({});
      try {
        const result = await googleLogin(tokenResponse.access_token);
        if (result.success) {
          toast.success(result.isNewUser ? "Welcome to Nexa Academy!" : "Welcome back!");
          redirectAfterLogin(result.user);
        } else {
          toast.error("Sign in failed. Please try again.");
        }
      } catch {
        toast.error("Sign in failed. Please try again.");
      } finally {
        setGoogleLoading(false);
      }
    },
    [googleLogin, redirectAfterLogin],
  );

  const onGoogleError = useCallback(() => {
    toast.error("Google sign-in failed. Please use email and password.");
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <Badge
              variant="outline"
              className="border-primary text-primary text-xs"
            >
              Student Portal
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to access your student dashboard
            </p>
          </div>

          <Card className="border border-border rounded-2xl">
            <CardContent className="p-6 sm:p-8 space-y-5">
              <div className="flex gap-2 rounded-md bg-muted/5 p-1">
                <button
                  className={`flex-1 py-2 text-sm font-medium rounded-md ${activeTab === "signin" ? "bg-background border border-border" : "text-foreground/70"}`}
                  onClick={() => setActiveTab("signin")}
                  type="button"
                >
                  Sign In
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-medium rounded-md ${activeTab === "signup" ? "bg-background border border-border" : "text-foreground/70"}`}
                  onClick={() => setActiveTab("signup")}
                  type="button"
                >
                  Create Account
                </button>
              </div>

              {activeTab === "signin" && (
                <form onSubmit={handleSignin} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        className="pl-9"
                        placeholder="john@example.com"
                        value={signin.email}
                        onChange={setSigninField("email")}
                        disabled={loading}
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="password"
                        className="pl-9"
                        placeholder="••••••••"
                        value={signin.password}
                        onChange={setSigninField("password")}
                        disabled={loading}
                        autoComplete="current-password"
                      />
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 gap-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" /> Sign In
                      </>
                    )}
                  </Button>
                </form>
              )}

              {activeTab === "signup" && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label className="text-sm">Full name</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        name="fullName"
                        value={signup.fullName}
                        onChange={setSignupField("fullName")}
                        className="pl-9"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm">Email Address</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        name="email"
                        value={signup.email}
                        onChange={setSignupField("email")}
                        className="pl-9"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm">Phone</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        name="phone"
                        value={signup.phone}
                        onChange={setSignupField("phone")}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Password</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        name="password"
                        type="password"
                        value={signup.password}
                        onChange={setSignupField("password")}
                        className="pl-9"
                        autoComplete="new-password"
                      />
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm">Confirm Password</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        name="confirmPassword"
                        type="password"
                        value={signup.confirmPassword}
                        onChange={setSignupField("confirmPassword")}
                        className="pl-9"
                        autoComplete="new-password"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 gap-2"
                  >
                    Create Account
                  </Button>
                </form>
              )}

              <Separator />

              {GOOGLE_ENABLED &&
                (googleLoading ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    className="w-full h-11 gap-3 border border-border"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      Signing in with Google...
                    </span>
                  </Button>
                ) : (
                  <GoogleSignInButton
                    onSuccess={onGoogleSuccess}
                    onError={onGoogleError}
                    disabled={loading}
                  />
                ))}

              <Separator />

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("signup")}
                  className="text-primary font-semibold hover:underline"
                >
                  Create one
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
