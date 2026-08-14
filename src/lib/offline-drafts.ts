export interface OfflineDraft {
  id: string;
  type: "lost" | "found";
  title: string;
  category: string;
  campusZone: string;
  location: string;
  date: string;
  description: string;
  sensitiveDetails?: string;
  contact: string;
  savedAt: string;
}

const STORAGE_KEY = "foundit_offline_drafts";

export class OfflineDraftsService {
  static getDrafts(): OfflineDraft[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as OfflineDraft[]) : [];
    } catch {
      return [];
    }
  }

  static saveDraft(draft: Omit<OfflineDraft, "id" | "savedAt">): OfflineDraft {
    const existing = this.getDrafts();
    const newDraft: OfflineDraft = {
      ...draft,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify([newDraft, ...existing]));
    return newDraft;
  }

  static removeDraft(id: string): void {
    const existing = this.getDrafts();
    const updated = existing.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  static clearDrafts(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
