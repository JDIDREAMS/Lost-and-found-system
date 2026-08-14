import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  X,
  Shield,
  Video,
  Image as ImageIcon,
  Lock,
  Sparkles,
  ScanText,
  WifiOff,
  Save,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, CAMPUS_ZONES } from "@/lib/lostfound";
import { performOcrScanOnFile, type OcrExtractionResult } from "@/lib/ocr";
import { OfflineDraftsService, type OfflineDraft } from "@/lib/offline-drafts";

export const Route = createFileRoute("/post")({
  head: () => ({
    meta: [
      { title: "Post lost or found item | FoundIt" },
      {
        name: "description",
        content:
          "Report a lost item or publish something you found so its owner can safely retrieve it.",
      },
      { property: "og:title", content: "Post item | FoundIt" },
      {
        property: "og:description",
        content: "Report a lost item or list a found item on FoundIt.",
      },
    ],
  }),
  component: Post,
});

function Post() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [type, setType] = useState<"lost" | "found">("lost");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]!);
  const [campusZone, setCampusZone] = useState<string>("library");
  const [description, setDescription] = useState("");
  const [sensitiveDetails, setSensitiveDetails] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [contact, setContact] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Array<{ url: string; isVideo: boolean }>>([]);
  const [busy, setBusy] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrExtractionResult | null>(null);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineDraft[]>([]);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
    setOfflineDrafts(OfflineDraftsService.getDrafts());
  }, [loading, user, navigate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const selectedFiles = Array.from(e.target.files);

    const newMedia = selectedFiles.map((file) => ({
      url: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
    }));

    setFiles((prev) => [...prev, ...selectedFiles]);
    setPreviews((prev) => [...prev, ...newMedia]);

    // Run OCR scanner on first image file
    const imageFile = selectedFiles.find((f) => !f.type.startsWith("video/"));
    if (imageFile) {
      const extracted = await performOcrScanOnFile(imageFile);
      if (extracted && (extracted.studentId || extracted.serialNumber || extracted.brand)) {
        setOcrResult(extracted);
        toast.info("🔍 OCR detected text from photo! See suggestions below.");
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const autofillOcr = (field: "all" | "sensitive") => {
    if (!ocrResult) return;

    if (field === "all") {
      if (ocrResult.suggestedTitle && !title) setTitle(ocrResult.suggestedTitle);
      if (ocrResult.suggestedDescription && !description)
        setDescription(ocrResult.suggestedDescription);
      if (ocrResult.studentId) setCategory("Student ID & Cards");
      else if (ocrResult.brand) setCategory("Electronics");
    }

    if (field === "sensitive" || ocrResult.sensitiveDetailFragment) {
      const fragment = ocrResult.sensitiveDetailFragment || ocrResult.rawText;
      setSensitiveDetails((prev) => (prev ? `${prev}\n${fragment}` : fragment));
    }

    toast.success("Details autofilled from photo text!");
  };

  const saveOfflineDraft = () => {
    OfflineDraftsService.saveDraft({
      type,
      title: title || "Untitled Draft",
      category,
      campusZone,
      location,
      date,
      description,
      sensitiveDetails,
      contact,
    });
    setOfflineDrafts(OfflineDraftsService.getDrafts());
    toast.success("Draft saved locally! You can restore or publish it anytime.");
  };

  const restoreDraft = (draft: OfflineDraft) => {
    setType(draft.type);
    setTitle(draft.title);
    setCategory(draft.category);
    setCampusZone(draft.campusZone || "library");
    setLocation(draft.location);
    setDate(draft.date);
    setDescription(draft.description);
    setSensitiveDetails(draft.sensitiveDetails || "");
    setContact(draft.contact);
    toast.success("Draft restored!");
  };

  const deleteDraft = (id: string) => {
    OfflineDraftsService.removeDraft(id);
    setOfflineDrafts(OfflineDraftsService.getDrafts());
    toast.success("Draft removed.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check if offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveOfflineDraft();
      return;
    }

    setBusy(true);

    try {
      let imagePayload: string | null = null;
      let videoUrl: string | null = null;

      // 1. Try uploading via Express backend media endpoint
      try {
        if (files.length > 0) {
          const uploadRes = await api.uploadMedia(files);
          if (uploadRes.urls.length > 0) {
            imagePayload =
              uploadRes.urls.length === 1
                ? (uploadRes.urls[0] ?? null)
                : JSON.stringify(uploadRes.urls);
          }
          if (uploadRes.videoUrl) {
            videoUrl = uploadRes.videoUrl;
          }
        }

        const { item: newItem } = await api.createItem({
          title: title.trim(),
          description: description.trim(),
          sensitive_details: sensitiveDetails.trim() || null,
          category,
          campus_zone: campusZone,
          item_type: type,
          location: location.trim(),
          date_occurred: date,
          contact_info: contact.trim() || null,
          image_url: imagePayload,
          video_url: videoUrl,
          ocr_text: ocrResult?.rawText || null,
        });

        toast.success("Your report is live.");
        void qc.invalidateQueries({ queryKey: ["items"] });
        void qc.invalidateQueries({ queryKey: ["my-items"] });
        void qc.invalidateQueries({ queryKey: ["my-smart-matches"] });
        void navigate({ to: "/items/$id", params: { id: newItem.id } });
        return;
      } catch (backendErr) {
        console.warn(
          "Backend API upload/create failed, attempting Supabase fallback...",
          backendErr,
        );
      }

      // 2. Fallback to Supabase if Express API is unreachable
      const uploadedPaths: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("item-images").upload(path, file);
        if (upErr) throw upErr;
        uploadedPaths.push(path);
      }

      imagePayload =
        uploadedPaths.length === 0
          ? null
          : uploadedPaths.length === 1
            ? (uploadedPaths[0] ?? null)
            : JSON.stringify(uploadedPaths);

      const { data, error } = await supabase
        .from("items")
        .insert({
          title: title.trim(),
          description: description.trim(),
          category,
          campus_zone: campusZone,
          item_type: type,
          location: location.trim(),
          date_occurred: date,
          contact_info: contact.trim() || null,
          image_url: imagePayload,
          video_url: videoUrl,
          sensitive_details: sensitiveDetails.trim() || null,
          posted_by: user.id,
          poster_name:
            (user.user_metadata?.["display_name"] as string | undefined) ||
            user.email?.split("@")[0] ||
            "Member",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Your report is live.");
      void qc.invalidateQueries({ queryKey: ["items"] });
      void qc.invalidateQueries({ queryKey: ["my-items"] });
      void qc.invalidateQueries({ queryKey: ["my-smart-matches"] });
      void navigate({ to: "/items/$id", params: { id: data.id } });
    } catch (err: unknown) {
      // Offline fallback: save draft locally
      saveOfflineDraft();
      const message = err instanceof Error ? err.message : "Saved as local draft.";
      toast.info(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="fluid-container-narrow py-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold">Post an item</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Report something you lost, or help return something you found.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={saveOfflineDraft}
            className="flex items-center gap-1.5 text-xs"
          >
            <Save className="size-3.5" /> Save Draft
          </Button>
        </div>

        {/* Offline Drafts Recovery Bar */}
        {offlineDrafts.length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <WifiOff className="size-4 text-amber-600" />
                <span>Offline Drafts Saved ({offlineDrafts.length})</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {offlineDrafts.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg bg-background/80 p-2.5 border"
                >
                  <div>
                    <span className="font-semibold text-foreground">
                      [{d.type.toUpperCase()}] {d.title}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      ({new Date(d.savedAt).toLocaleDateString()})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => restoreDraft(d)}
                      className="h-7 text-xs text-primary"
                    >
                      Restore
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDraft(d.id)}
                      className="h-7 text-xs text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-8 space-y-6">
          {/* Post Type Selector */}
          <div className="grid grid-cols-2 gap-2 rounded-xl border p-1">
            <button
              type="button"
              onClick={() => setType("lost")}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                type === "lost"
                  ? "bg-lost text-lost-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              I lost something
            </button>
            <button
              type="button"
              onClick={() => setType("found")}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                type === "found"
                  ? "bg-found text-found-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              I found something
            </button>
          </div>

          {/* OCR Detection Banner */}
          {ocrResult && (
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-indigo-800 dark:text-indigo-300">
                  <ScanText className="size-4 text-indigo-600" />
                  <span>OCR Auto-Extracted Text from Photo</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOcrResult(null)}
                  className="h-6 w-6 p-0 text-muted-foreground"
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              <div className="rounded-xl border border-indigo-500/20 bg-background/80 p-2.5 font-mono text-xs">
                {ocrResult.rawText}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => autofillOcr("all")}
                  className="h-7 text-xs border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                >
                  <CheckCircle2 className="size-3 mr-1" /> Autofill Title &amp; Category
                </Button>
                {ocrResult.sensitiveDetailFragment && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => autofillOcr("sensitive")}
                    className="h-7 text-xs border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                  >
                    <Lock className="size-3 mr-1" /> Autofill Secret Evidence
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Item name</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Silver MacBook Air M2 13-inch"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">{type === "lost" ? "Date lost" : "Date found"}</Label>
              <Input
                id="date"
                type="date"
                required
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Campus Geo-Zone</Label>
              <Select value={campusZone} onValueChange={setCampusZone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPUS_ZONES.filter((z) => z.id !== "all").map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.icon} {z.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Specific Spot / Room</Label>
              <Input
                id="location"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. 2nd floor study cubicle #4"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Public Description</Label>
            <Textarea
              id="desc"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Colour, brand, general appearance, where it was spotted…"
            />
          </div>

          {/* Protected Sensitive Detail Field */}
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/5 via-card to-card p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Lock className="size-3.5" />
                </div>
                <Label htmlFor="sensitive-detail" className="font-semibold text-xs text-foreground">
                  Sensitive Verification Detail{" "}
                  <span className="font-normal text-muted-foreground">(Hidden from public)</span>
                </Label>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                🛡️ Secret Evidence
              </span>
            </div>

            <Textarea
              id="sensitive-detail"
              rows={2}
              value={sensitiveDetails}
              onChange={(e) => setSensitiveDetails(e.target.value)}
              placeholder="e.g. Engraved initials 'J.D.' on back, lock screen image is a sunset, exactly $45 in cash inside pocket..."
              className="text-xs"
            />

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              💡 <strong>How it protects you:</strong> Opportunists cannot see this secret detail.
              It will stay hidden from the public and unlock <em>only</em> when you approve a
              legitimate claimant.
            </p>
          </div>

          <div className="space-y-1.5">
            {type === "found" ? (
              <>
                <Label htmlFor="contact">
                  WhatsApp number{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (so the verified owner can reach you)
                  </span>
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
                    +
                  </span>
                  <Input
                    id="contact"
                    type="tel"
                    required
                    className="pl-6"
                    value={contact}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      setContact(raw);
                    }}
                    placeholder="2348012345678"
                  />
                </div>
              </>
            ) : (
              <>
                <Label htmlFor="contact">
                  Contact note{" "}
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. Best reached in the evenings"
                />
              </>
            )}
          </div>

          {/* Rich Media Evidence Uploader (Photos & Video) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="size-4 text-primary" />
                <Label htmlFor="media-upload" className="font-semibold text-xs">
                  Rich Evidence (Photos &amp; Short Video Clip)
                </Label>
              </div>
              {files.length > 0 && (
                <span className="text-xs text-muted-foreground font-medium">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </span>
              )}
            </div>

            <label
              htmlFor="media-upload"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground transition hover:bg-muted/50 text-center"
            >
              <div className="flex items-center gap-2 text-primary">
                <Upload className="size-5" />
                <Video className="size-5" />
              </div>
              <div>
                <span className="font-medium text-foreground">
                  Click to upload photos or short video
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Images (PNG, JPG, WebP) &amp; short video clips (MP4, WebM, MOV up to 25MB)
                </p>
              </div>
            </label>
            <input
              id="media-upload"
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              multiple
              className="sr-only"
              onChange={handleFileChange}
            />

            {/* Thumbnail previews & Video Player */}
            {previews.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {previews.map((item, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-square overflow-hidden rounded-xl border bg-muted"
                  >
                    {item.isVideo ? (
                      <video
                        src={item.url}
                        className="h-full w-full object-cover"
                        controls={false}
                        muted
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt={`Upload preview ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    )}

                    {item.isVideo && (
                      <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        <Video className="size-2.5" /> Video
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white opacity-90 transition hover:bg-red-600"
                      title="Remove file"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Publishing Evidence...
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Publish report
              </>
            )}
          </Button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
