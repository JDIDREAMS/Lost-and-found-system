import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Trash2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  Shield,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { api, Report, AuditLog } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime, statusLabel, type ItemRow } from "@/lib/lostfound";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Escalation & Moderation | FoundIt" },
      {
        name: "description",
        content:
          "Moderate listings, review escalated reports, enforce campus community guidelines, and audit moderation logs.",
      },
    ],
  }),
  component: Admin,
});

const REASON_LABELS: Record<
  string,
  { label: string; variant: "destructive" | "default" | "secondary" | "outline" }
> = {
  fraud: { label: "Fraudulent / Suspicious", variant: "destructive" },
  fake_claim: { label: "Fake Ownership Claim", variant: "destructive" },
  harassment: { label: "Harassment / Abuse", variant: "destructive" },
  inappropriate: { label: "Inappropriate Content", variant: "default" },
  spam: { label: "Spam / Promo", variant: "secondary" },
  other: { label: "Other Violation", variant: "outline" },
};

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"reports" | "listings" | "audit">("reports");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolutionAction, setResolutionAction] = useState<
    "none" | "item_removed" | "warning_issued" | "user_suspended"
  >("none");
  const [resolutionStatus, setResolutionStatus] = useState<
    "investigating" | "resolved" | "dismissed"
  >("resolved");
  const [adminNotes, setAdminNotes] = useState("");
  const [busyAction, setBusyAction] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) void navigate({ to: "/auth" });
    else if (!isAdmin) void navigate({ to: "/dashboard" });
  }, [loading, user, isAdmin, navigate]);

  // 1. Items query
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["admin-items"],
    enabled: !!isAdmin,
    queryFn: async () => {
      try {
        const { items } = await api.getItems();
        return items as unknown as ItemRow[];
      } catch {
        const { data, error } = await supabase
          .from("items")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as ItemRow[];
      }
    },
  });

  // 2. Reports query
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["admin-reports"],
    enabled: !!isAdmin,
    queryFn: async () => {
      try {
        const { reports } = await api.getAdminReports();
        return reports;
      } catch {
        return [] as Report[];
      }
    },
  });

  // 3. Audit logs query
  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    enabled: !!isAdmin && activeTab === "audit",
    queryFn: async () => {
      try {
        const { logs } = await api.getAuditLogs();
        return logs;
      } catch {
        return [] as AuditLog[];
      }
    },
  });

  // 4. Claims count query
  const { data: claimCount } = useQuery({
    queryKey: ["admin-claim-count"],
    enabled: !!isAdmin,
    queryFn: async () => {
      try {
        const { claims } = await api.getClaims();
        return claims.length;
      } catch {
        const { count, error } = await supabase
          .from("claims")
          .select("id", { count: "exact", head: true });
        if (error) throw error;
        return count ?? 0;
      }
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.deleteItem(id);
      } catch {
        const { error } = await supabase.from("items").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Listing removed.");
      void qc.invalidateQueries({ queryKey: ["admin-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleOpenResolveDialog = (
    report: Report,
    status: "investigating" | "resolved" | "dismissed",
    action: "none" | "item_removed" | "warning_issued" | "user_suspended" = "none",
  ) => {
    setSelectedReport(report);
    setResolutionStatus(status);
    setResolutionAction(action);
    setAdminNotes("");
  };

  const handleExecuteResolution = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReport) return;

    setBusyAction(true);
    try {
      await api.resolveReport(selectedReport.id, {
        status: resolutionStatus,
        action_taken: resolutionAction,
        admin_notes: adminNotes.trim() || null,
      });

      toast.success(`Report #${selectedReport.id.slice(0, 8)} ${resolutionStatus}.`);
      setSelectedReport(null);
      void qc.invalidateQueries({ queryKey: ["admin-reports"] });
      void qc.invalidateQueries({ queryKey: ["admin-items"] });
      void qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve report.");
    } finally {
      setBusyAction(false);
    }
  };

  const openReportsCount = (reports ?? []).filter(
    (r) => r.status === "open" || r.status === "investigating",
  ).length;

  const stats = [
    { label: "Active Escalations", value: openReportsCount, alert: openReportsCount > 0 },
    { label: "Total Listings", value: items?.length ?? 0 },
    { label: "Total Claims", value: claimCount ?? 0 },
    {
      label: "Resolved Items",
      value: items?.filter((i: ItemRow) => i.status === "resolved").length ?? 0,
    },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="fluid-container py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-6 text-primary" />
              <h1 className="font-display text-2xl sm:text-3xl font-semibold">
                Moderation &amp; Escalation Center
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Review flagged content, enforce community rules, resolve disputed claims, and review
              audit logs.
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/10 px-3 py-1 font-semibold text-primary"
          >
            🛡️ Admin Privilege Active
          </Badge>
        </div>

        {/* Stats Row */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl border p-5 shadow-soft transition ${
                s.alert
                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                  : "border-border bg-card"
              }`}
            >
              <p className="text-sm font-medium opacity-80">{s.label}</p>
              <p className="mt-1 font-display text-2xl sm:text-3xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "reports" | "listings" | "audit")}
            className="w-full"
          >
            <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-3 max-w-lg p-1">
              <TabsTrigger value="reports" className="relative gap-2 text-xs font-semibold">
                <ShieldAlert className="size-3.5" />
                Moderation Queue
                {openReportsCount > 0 && (
                  <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.2 text-[10px] text-destructive-foreground">
                    {openReportsCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="listings" className="gap-2 text-xs font-semibold">
                <FileText className="size-3.5" />
                Listings ({items?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2 text-xs font-semibold">
                <Clock className="size-3.5" />
                Audit Logs
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Moderation Queue */}
            <TabsContent value="reports" className="mt-6 space-y-4">
              <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
                {reportsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (reports ?? []).length === 0 ? (
                  <div className="p-12 text-center">
                    <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
                    <h3 className="mt-3 text-lg font-semibold">All Clear!</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      No open reports or flags in the moderation queue.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Target</TableHead>
                          <TableHead>Reason &amp; Details</TableHead>
                          <TableHead>Reporter</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reported At</TableHead>
                          <TableHead className="text-right">Quick Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(reports ?? []).map((report) => {
                          const reasonInfo = REASON_LABELS[report.reason] || {
                            label: report.reason,
                            variant: "outline",
                          };

                          return (
                            <TableRow
                              key={report.id}
                              className={report.status === "open" ? "bg-destructive/5" : ""}
                            >
                              <TableCell>
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    {report.target_type}
                                  </span>
                                  <p className="font-semibold text-xs text-foreground">
                                    {report.target_preview ||
                                      `ID: ${report.target_id.slice(0, 8)}...`}
                                  </p>
                                  {report.target_type === "item" && (
                                    <Link
                                      to="/items/$id"
                                      params={{ id: report.target_id }}
                                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                                    >
                                      Inspect item <ExternalLink className="size-2.5" />
                                    </Link>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell className="max-w-xs">
                                <div className="space-y-1">
                                  <Badge variant={reasonInfo.variant} className="text-[10px]">
                                    {reasonInfo.label}
                                  </Badge>
                                  {report.description && (
                                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                                      "{report.description}"
                                    </p>
                                  )}
                                  {report.admin_notes && (
                                    <p className="text-[11px] text-primary">
                                      <strong>Admin note:</strong> {report.admin_notes}
                                    </p>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell className="text-xs text-muted-foreground">
                                {report.reporter_name || report.reporter_id.slice(0, 8)}
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant={
                                    report.status === "resolved"
                                      ? "outline"
                                      : report.status === "dismissed"
                                        ? "secondary"
                                        : "destructive"
                                  }
                                  className="text-[10px] font-semibold uppercase"
                                >
                                  {report.status}
                                </Badge>
                              </TableCell>

                              <TableCell className="text-xs text-muted-foreground">
                                {formatDateTime(report.created_at)}
                              </TableCell>

                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {report.status !== "resolved" && report.status !== "dismissed" ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10"
                                        onClick={() =>
                                          handleOpenResolveDialog(
                                            report,
                                            "resolved",
                                            report.target_type === "item"
                                              ? "item_removed"
                                              : "warning_issued",
                                          )
                                        }
                                      >
                                        <AlertTriangle className="size-3" />
                                        {report.target_type === "item"
                                          ? "Remove Item"
                                          : "Take Action"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 gap-1 text-xs text-muted-foreground hover:bg-muted"
                                        onClick={() =>
                                          handleOpenResolveDialog(report, "dismissed", "none")
                                        }
                                      >
                                        <XCircle className="size-3" /> Dismiss
                                      </Button>
                                    </>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground italic">
                                      Action: {report.action_taken || "none"}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: Listings Moderation */}
            <TabsContent value="listings" className="mt-6">
              <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
                {itemsLoading ? (
                  <Skeleton className="h-72 w-full" />
                ) : (
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Posted</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(items ?? []).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Link
                                to="/items/$id"
                                params={{ id: item.id }}
                                className="font-medium hover:underline"
                              >
                                {item.title}
                              </Link>
                              <p className="text-xs text-muted-foreground">{item.poster_name}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.item_type === "lost" ? "lost" : "found"}>
                                {item.item_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{statusLabel[item.status]}</TableCell>
                            <TableCell className="text-sm">{formatDate(item.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => remove.mutate(item.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: Audit Logs */}
            <TabsContent value="audit" className="mt-6">
              <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
                {logsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (auditLogs ?? []).length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    No moderation audit log entries recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Admin</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(auditLogs ?? []).map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDateTime(log.created_at)}
                            </TableCell>
                            <TableCell className="text-xs font-semibold">
                              {log.admin_name || log.admin_id.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-semibold">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground uppercase">
                              {log.target_type}: {log.target_id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {log.details || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Resolution Dialog Modal */}
        <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                <DialogTitle>Resolve Moderation Report</DialogTitle>
              </div>
              <DialogDescription>
                Execute an administrative action and close report #{selectedReport?.id.slice(0, 8)}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleExecuteResolution} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status Decision
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionStatus("resolved")}
                    className={`rounded-lg border p-2.5 text-xs font-medium transition ${
                      resolutionStatus === "resolved"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-surface"
                    }`}
                  >
                    Resolve Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionStatus("dismissed")}
                    className={`rounded-lg border p-2.5 text-xs font-medium transition ${
                      resolutionStatus === "dismissed"
                        ? "border-muted-foreground bg-muted text-foreground"
                        : "border-border text-muted-foreground hover:bg-surface"
                    }`}
                  >
                    Dismiss (False Alarm)
                  </button>
                </div>
              </div>

              {resolutionStatus === "resolved" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Action to Take
                  </Label>
                  <div className="space-y-1.5">
                    {(
                      [
                        { id: "item_removed", label: "Remove Listing / Content" },
                        { id: "warning_issued", label: "Issue Formal Warning to User" },
                        { id: "user_suspended", label: "Suspend Account Privileges" },
                        { id: "none", label: "No further penalty" },
                      ] as const
                    ).map((act) => (
                      <button
                        type="button"
                        key={act.id}
                        onClick={() => setResolutionAction(act.id)}
                        className={`flex w-full items-center justify-between rounded-lg border p-2 text-left text-xs transition ${
                          resolutionAction === act.id
                            ? "border-destructive/60 bg-destructive/10 font-semibold text-destructive"
                            : "border-border hover:bg-surface text-muted-foreground"
                        }`}
                      >
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="res-notes" className="text-xs font-semibold">
                  Admin Resolution Note (Visible in Audit Log)
                </Label>
                <Textarea
                  id="res-notes"
                  rows={3}
                  placeholder="Describe why this decision was made..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedReport(null)}
                  disabled={busyAction}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busyAction} className="gap-2">
                  {busyAction ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" /> Confirm Resolution
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
      <SiteFooter />
    </div>
  );
}
