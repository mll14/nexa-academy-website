import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Mail, Lock } from "lucide-react";
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

export default function PostSubmitAuth({
  prefillEmail = "",
  onSuccess,
  onSkip,
}) {
  const { currentUser, signUp, googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSignup = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const email = data.get("email")?.trim();
    const password = data.get("password")?.trim();
    const confirm = data.get("confirmPassword")?.trim();
    const payload = {
      email,
      password,
      display_name: data.get("fullName")?.trim() || "",
      phone: data.get("phone")?.trim() || "",
    };

    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const result = await signUp(payload);
      if (result.success) {
        if (onSuccess) onSuccess(result.user?.uid || result.user?.id);
      } else {
        toast.error(result.error || "Sign up failed");
      }
    } catch (err) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSuccess = useCallback(
    async (tokenResponse) => {
      setLoading(true);
      setErrors({});
      try {
        const result = await googleLogin(tokenResponse.access_token);
        if (result.success) {
          if (onSuccess) onSuccess(result.user?.uid || result.user?.id);
        } else toast.error(result.error || "Google sign-in failed");
      } catch (err) {
        toast.error(err.message || "Google sign-in failed");
      } finally {
        setLoading(false);
      }
    },
    [googleLogin, onSuccess],
  );

  const onGoogleError = useCallback((err) => {
    toast.error(err?.error_description || "Google sign-in failed");
  }, []);

  if (currentUser) return null;

  return (
    <Card className="border border-border rounded-2xl">
      <CardContent className="p-5 space-y-4">
        <h3 className="font-semibold">
          Create your student account to track your application
        </h3>
        <p className="text-sm text-muted-foreground">
          Quickly create an account to access your dashboard and application
          updates.
        </p>

        {/* submit-level messages shown via toast notifications */}

        <form onSubmit={handleSignup} className="space-y-3">
          <div>
            <Label className="text-sm">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                name="email"
                defaultValue={prefillEmail}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input name="password" type="password" className="pl-9" />
            </div>
          </div>
          <div>
            <Label className="text-sm">Confirm Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input name="confirmPassword" type="password" className="pl-9" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 bg-primary text-primary-foreground h-11"
              >
                Create Account
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => onSkip && onSkip()}
              >
                I'll create an account later
              </Button>
            </div>
            <Separator />
            {GOOGLE_ENABLED ? (
              <GoogleSignInButton
                onSuccess={onGoogleSuccess}
                onError={onGoogleError}
                disabled={loading}
              />
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Google sign-in not configured
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
