import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Upload, X, Images } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORIES, type ItemType } from "@/lib/lostfound";
import { api } from "@/lib/api";

export const Route = createFileRoute("/post")({
  head: () => ({
    meta: [
      { title: "Report a lost or found item | FoundIt" },
      {
        name: "description",
        content:
          "Post a lost or found item with multiple photos, location and date so the right person can find it.",
      },
      { property: "og:title", content: "Report a lost or found item | FoundIt" },
      {
        property: "og:description",
        content: "Add a listing to the campus lost and found board in under a minute.",
      },
    ],
  }),
  component: PostItem,
});

function PostItem() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<ItemType>("lost");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [contact, setContact] = useState("");
  
  // Support multiple files
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const selectedFiles = Array.from(e.target.files);
    
    setFiles((prev) => [...prev, ...selectedFiles]);
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target);
      return prev.filter((_, i) => i !== index);
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let imagePayload: string | null = null;

      // 1. Try uploading via Express backend API
      try {
        if (files.length > 0) {
          const urls = await api.uploadPhotos(files);
          imagePayload = urls.length === 1 ? urls[0] : JSON.stringify(urls);
        }
        const { item: newItem } = await api.createItem({
          title: title.trim(),
          description: description.trim(),
          category,
          item_type: type,
          location: location.trim(),
          date_occurred: date,
          contact_info: contact.trim() || null,
          image_url: imagePayload,
        });
        toast.success("Your report is live.");
        void navigate({ to: "/items/$id", params: { id: newItem.id } });
        return;
      } catch (backendErr) {
        console.warn("Backend API upload/create failed, attempting Supabase fallback...", backendErr);
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
          item_type: type,
          location: location.trim(),
          date_occurred: date,
          contact_info: contact.trim() || null,
          image_url: imagePayload,
          posted_by: user.id,
          poster_name: (user.user_metadata?.["display_name"] as string) || user.email || "Member",
        })
        .select("id")
        .single();

      if (error) throw error;
      toast.success("Your report is live.");
      void navigate({ to: "/items/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post the item.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Report an item</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The more detail and photos you add, the faster the match.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border bg-card p-6 shadow-soft">
          <Tabs value={type} onValueChange={(v) => setType(v as ItemType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lost">I lost something</TabsTrigger>
              <TabsTrigger value="found">I found something</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Black leather wallet"
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

          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Main Library, second floor"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Colour, brand, distinguishing marks, what was inside…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact">Contact note (optional)</Label>
            <Input
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Best reached in the evenings"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="photos">Photos (Upload multiple)</Label>
              {files.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {files.length} photo{files.length > 1 ? "s" : ""} selected
                </span>
              )}
            </div>

            <label
              htmlFor="photos"
              className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-sm text-muted-foreground transition hover:bg-muted/50"
            >
              <Upload className="size-5 text-primary" />
              <div className="text-center">
                <span className="font-medium text-foreground">Click to upload photos</span>
                <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG or WEBP (select multiple)</p>
              </div>
            </label>
            <input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={handleFileChange}
            />

            {/* Thumbnail previews */}
            {previews.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {previews.map((url, idx) => (
                  <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl border bg-muted">
                    <img src={url} alt={`Upload preview ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-90 transition hover:bg-red-600"
                      title="Remove image"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Publish report
          </Button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
