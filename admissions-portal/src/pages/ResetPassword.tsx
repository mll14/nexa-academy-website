import { useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { resetPassword } from "../lib/api";
import { ApiError } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";

export function ResetPassword() {
  const { uid, token } = useSearch({ from: "/reset-password" });

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const invalidLink = !uid || !token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await resetPassword(uid!, token!, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a strong password for your Nexa Academy account.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            {invalidLink ? (
              <div className="flex items-start gap-3 py-2">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Invalid reset link</p>
                  <p className="text-sm text-muted-foreground">
                    This link is missing required parameters. Please request a new one.
                  </p>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Request a new reset link
                  </Link>
                </div>
              </div>
            ) : done ? (
              <div className="space-y-4 text-center py-2">
                <div className="flex justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">Password updated!</p>
                  <p className="text-sm text-muted-foreground">
                    Your password has been changed. You can now sign in with your new password.
                  </p>
                </div>
                <Link to="/login" search={{ redirect: undefined }}>
                  <Button className="w-full mt-2">Go to Login</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      className="pl-9 pr-10"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      disabled={loading}
                      autoFocus
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type={showPw ? "text" : "password"}
                      className="pl-9"
                      placeholder="Repeat password"
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {error && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating…
                    </span>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {!done && !invalidLink && (
          <p className="text-center text-sm text-muted-foreground">
            Link expired?{" "}
            <Link to="/forgot-password" className="text-primary hover:underline">
              Request a new one
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
