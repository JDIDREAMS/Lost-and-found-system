import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password | FoundIt" },
      {
        name: "description",
        content: "Set a new password for your FoundIt campus lost & found account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if session exists or access token was provided in URL hash
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // Listening for PASSWORD_RECOVERY event
      }
    });
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match. Please check and try again.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setBusy(true);

    const searchParams =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const token = searchParams?.get("token");

    if (token) {
      try {
        const { api } = await import("@/lib/api");
        await api.resetPassword({ token, password });
        setSuccess(true);
        toast.success("Password updated successfully!");
        setTimeout(() => {
          void navigate({ to: "/auth" });
        }, 2000);
        return;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to reset password.");
        setBusy(false);
        return;
      } finally {
        setBusy(false);
      }
    }

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSuccess(true);
    toast.success("Password updated successfully!");
    setTimeout(() => {
      void navigate({ to: "/dashboard" });
    }, 2000);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-lift">
        <div className="text-center">
          <Link to="/" className="inline-block font-display text-2xl font-semibold text-primary">
            FoundIt
          </Link>
          <h1 className="mt-4 flex flex-col sm:flex-row sm:items-center justify-center gap-2 text-xl sm:text-2xl font-bold">
            <KeyRound className="size-6 text-primary" /> Reset Your Password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter a new password for your account below.
          </p>
        </div>

        {success ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="mx-auto size-10" />
            <p className="mt-3 font-semibold">Password Reset Complete!</p>
            <p className="mt-1 text-xs opacity-90">Redirecting you to your dashboard...</p>
            <Button className="mt-4 w-full" onClick={() => void navigate({ to: "/dashboard" })}>
              Go to Dashboard Now
            </Button>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
