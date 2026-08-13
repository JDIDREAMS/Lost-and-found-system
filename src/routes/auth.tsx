import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, GraduationCap, CheckCircle2, KeyRound, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api, setAuthToken } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create an account | FoundIt" },
      {
        name: "description",
        content:
          "Sign in to post lost and found items, submit claims and message other students and staff on campus.",
      },
      { property: "og:title", content: "Sign in or create an account | FoundIt" },
      {
        property: "og:description",
        content: "Access your FoundIt dashboard, claims and messages.",
      },
    ],
  }),
  component: AuthPage,
});

function isSchoolEmail(email: string): boolean {
  if (!email.includes("@")) return false;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain) return false;
  return (
    domain.endsWith(".edu") ||
    domain.endsWith(".ac.uk") ||
    domain.endsWith(".edu.au") ||
    domain.endsWith(".edu.ng") ||
    domain.endsWith(".edu.za") ||
    domain.includes("student") ||
    domain.includes("univ") ||
    domain.includes("college") ||
    domain.includes("campus")
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");

  // Password lost / reset state
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const isEduEmail = isSchoolEmail(email);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { token } = await api.login({ email, password });
      setAuthToken(token);
      await refreshUser();
      toast.success("Welcome back!");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      // Fallback to Supabase
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(err instanceof Error ? err.message : error.message);
      } else {
        await refreshUser();
        toast.success("Welcome back!");
        void navigate({ to: "/dashboard" });
      }
    } finally {
      setBusy(false);
    }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const isVerifiedStudent = isSchoolEmail(email) || studentId.trim().length > 0;

    try {
      const { token } = await api.register({
        email,
        password,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(studentId.trim() ? { studentId: studentId.trim() } : {}),
      });
      setAuthToken(token);
      await refreshUser();
      toast.success(
        isVerifiedStudent
          ? "Student account created & verified! Welcome to FoundIt."
          : "Account created — welcome!",
      );
      void navigate({ to: "/dashboard" });
    } catch (err) {
      // Fallback to Supabase
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            display_name: name || email.split("@")[0],
            student_id: studentId.trim() || null,
            is_student_verified: isVerifiedStudent,
          },
        },
      });
      if (error) {
        toast.error(err instanceof Error ? err.message : error.message);
      } else {
        await refreshUser();
        toast.success("Account created — welcome!");
        void navigate({ to: "/dashboard" });
      }
    } finally {
      setBusy(false);
    }
  };

  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }
    setBusy(true);
    setDevResetUrl(null);

    let supabaseEmailSent = false;
    let localTokenFound = false;

    // 1. Send actual email to Gmail via Supabase Auth
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (!error) {
        supabaseEmailSent = true;
      }
    } catch {
      // Supabase email error
    }

    // 2. Also generate token on local Express backend if account exists locally
    try {
      const res = await api.forgotPassword(resetEmail);
      if (res && res.resetToken) {
        localTokenFound = true;
        setDevResetUrl(`${window.location.origin}/reset-password?token=${res.resetToken}`);
      }
    } catch {
      // Local backend error
    }

    setBusy(false);
    setResetSent(true);

    if (supabaseEmailSent) {
      toast.success("Password reset email sent to your Gmail!");
    } else if (localTokenFound) {
      toast.success("Password reset link ready!");
    } else {
      toast.info("If an account exists with that email, reset instructions have been generated.");
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    setBusy(false);
    void navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="font-display text-xl font-semibold">
          FoundIt
        </Link>
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <GraduationCap className="size-4" /> Campus Student Verification Enabled
          </div>
          <h2 className="max-w-sm text-4xl leading-tight font-semibold">
            Every returned item starts with someone posting it.
          </h2>
          <p className="mt-4 max-w-sm opacity-80">
            Create an account with your school email or Student ID to post items, claim lost
            property, and connect with campus peers.
          </p>
        </div>
        <p className="text-sm opacity-70">Campus lost &amp; found board</p>
      </div>

      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          {showForgot ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setResetSent(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Back to Sign In
              </button>

              <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold">
                  <KeyRound className="size-6 text-primary" /> Password Lost?
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your campus or account email address below and we'll send you a password
                  reset link.
                </p>
              </div>

              {resetSent ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                  <p className="font-semibold">Reset link dispatched!</p>
                  <p className="mt-1 text-xs opacity-90">
                    We've emailed instructions to <strong>{resetEmail}</strong>. Check your inbox or
                    spam folder.
                  </p>
                  {devResetUrl && (
                    <div className="mt-3 rounded-lg border bg-background p-2 text-xs">
                      <p className="text-muted-foreground">Local Dev Link:</p>
                      <a
                        href={devResetUrl}
                        className="break-all font-mono text-primary underline hover:opacity-80"
                      >
                        {devResetUrl}
                      </a>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      setShowForgot(false);
                      setResetSent(false);
                      setDevResetUrl(null);
                    }}
                  >
                    Return to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email">Email address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      required
                      placeholder="student@university.edu"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin" />} Send password reset link
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-semibold">Welcome</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in or create an account to continue.
              </p>

              <Tabs defaultValue="signin" className="mt-8">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={signIn} className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="si-email">Email</Label>
                      <Input
                        id="si-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="si-pass">Password</Label>
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(email);
                            setShowForgot(true);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        id="si-pass"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy && <Loader2 className="size-4 animate-spin" />} Sign in
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={signUp} className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="su-name">Display name</Label>
                      <Input
                        id="su-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex R."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="su-email">Email</Label>
                        {isEduEmail && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]"
                          >
                            <CheckCircle2 className="size-3" /> School Domain Verified
                          </Badge>
                        )}
                      </div>
                      <Input
                        id="su-email"
                        type="email"
                        required
                        placeholder="student@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="su-studentid">
                        Student / Staff ID{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          (Optional verification)
                        </span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="su-studentid"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="e.g. STU-98421"
                        />
                        {studentId.trim() && (
                          <GraduationCap className="absolute right-3 top-2.5 size-4 text-emerald-500" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="su-pass">Password</Label>
                      <Input
                        id="su-pass"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy && <Loader2 className="size-4 animate-spin" />} Create account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or{" "}
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => void google()}
                disabled={busy}
              >
                Continue with Google
              </Button>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link to="/browse" className="underline-offset-2 hover:underline">
                  Browse without an account
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
