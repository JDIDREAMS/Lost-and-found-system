import { supabaseAdmin, createScopedClient } from "../config/supabase.js";
import { store, ClaimRecord, MeetupProposal, HandoverStatus } from "../db/store.js";
import { ItemsService } from "./items.service.js";

export class ClaimsService {
  static async getAllForUser(userId: string, role?: string): Promise<ClaimRecord[]> {
    const combinedMap = new Map<string, ClaimRecord>();

    // 1. Fetch from Supabase
    try {
      if (role === "admin") {
        const { data, error } = await supabaseAdmin
          .from("claims")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) {
          for (const c of data as ClaimRecord[]) {
            combinedMap.set(c.id, c);
          }
        }
      } else {
        const { data, error } = await supabaseAdmin
          .from("claims")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) {
          for (const c of data as ClaimRecord[]) {
            combinedMap.set(c.id, c);
          }
        }
      }
    } catch {
      // ignore
    }

    // 2. Fetch from local store
    for (const sc of store.getClaims()) {
      if (!combinedMap.has(sc.id)) {
        combinedMap.set(sc.id, sc);
      }
    }

    const allClaims = Array.from(combinedMap.values());

    if (role === "admin") {
      return allClaims;
    }

    // Filter to claims where user is claimant OR user is item poster
    const allItems = await ItemsService.getAll();
    const userItemIds = new Set(allItems.filter((i) => i.posted_by === userId).map((i) => i.id));

    return allClaims
      .filter((c) => c.claimant_id === userId || userItemIds.has(c.item_id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async getByItemId(itemId: string): Promise<ClaimRecord[]> {
    const combinedMap = new Map<string, ClaimRecord>();

    // 1. Fetch from Supabase
    try {
      const { data, error } = await supabaseAdmin
        .from("claims")
        .select("*")
        .eq("item_id", itemId)
        .order("created_at", { ascending: false });
      if (!error && data) {
        for (const c of data as ClaimRecord[]) {
          combinedMap.set(c.id, c);
        }
      }
    } catch {
      // ignore
    }

    // 2. Fetch from local store
    for (const sc of store.getClaims().filter((c) => c.item_id === itemId)) {
      if (!combinedMap.has(sc.id)) {
        combinedMap.set(sc.id, sc);
      }
    }

    return Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  static async getById(claimId: string): Promise<ClaimRecord | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from("claims")
        .select("*")
        .eq("id", claimId)
        .single();
      if (!error && data) {
        const local = store.getClaimById(claimId);
        return {
          ...(data as ClaimRecord),
          meetup: local?.meetup ?? (data as ClaimRecord).meetup,
          handover: local?.handover ?? (data as ClaimRecord).handover,
        };
      }
    } catch {
      // ignore
    }
    return store.getClaimById(claimId) || null;
  }

  static async create(
    claim: Omit<ClaimRecord, "id" | "created_at">,
    userToken?: string,
  ): Promise<ClaimRecord> {
    const newRecord: ClaimRecord = {
      id: crypto.randomUUID(),
      ...claim,
      created_at: new Date().toISOString(),
    };

    // Always persist to local store
    store.addClaim(newRecord);

    // Attempt to persist to Supabase
    try {
      const client = userToken ? createScopedClient(userToken) : supabaseAdmin;
      const { data, error } = await client
        .from("claims")
        .insert({
          id: newRecord.id,
          item_id: claim.item_id,
          claimant_id: claim.claimant_id,
          message: claim.message,
          status: claim.status || "pending",
        })
        .select()
        .single();

      if (!error && data) {
        return {
          ...(data as ClaimRecord),
          proof_details: claim.proof_details || null,
        };
      }
    } catch {
      // ignore
    }

    return newRecord;
  }

  static async updateStatus(
    id: string,
    status: "pending" | "approved" | "rejected",
    decisionReason?: string | null,
    userToken?: string,
  ): Promise<ClaimRecord | null> {
    const updatedLocal = store.updateClaim(id, {
      status,
      decision_reason: decisionReason,
    });

    try {
      const client = userToken ? createScopedClient(userToken) : supabaseAdmin;
      const { data, error } = await client
        .from("claims")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        return {
          ...(data as ClaimRecord),
          decision_reason: decisionReason || null,
        };
      }
    } catch {
      // ignore
    }

    return updatedLocal;
  }

  static async proposeMeetup(
    claimId: string,
    proposal: {
      location: string;
      scheduled_time: string;
      notes?: string | null;
    },
    proposedBy: string,
  ): Promise<ClaimRecord | null> {
    const meetup: MeetupProposal = {
      location: proposal.location,
      scheduled_time: proposal.scheduled_time,
      notes: proposal.notes || null,
      proposed_by: proposedBy,
      status: "proposed",
      updated_at: new Date().toISOString(),
    };

    return store.updateClaim(claimId, { meetup });
  }

  static async respondMeetup(
    claimId: string,
    status: "accepted" | "declined",
  ): Promise<ClaimRecord | null> {
    const claim = store.getClaimById(claimId);
    if (!claim || !claim.meetup) return null;

    const updatedMeetup: MeetupProposal = {
      ...claim.meetup,
      status,
      updated_at: new Date().toISOString(),
    };

    return store.updateClaim(claimId, { meetup: updatedMeetup });
  }

  static async confirmHandover(
    claimId: string,
    userId: string,
    isPoster: boolean,
    userToken?: string,
  ): Promise<{ claim: ClaimRecord | null; isFullyCompleted: boolean }> {
    const claim = store.getClaimById(claimId);
    if (!claim) return { claim: null, isFullyCompleted: false };

    const currentHandover: HandoverStatus = claim.handover || {
      poster_confirmed: false,
      claimant_confirmed: false,
    };

    const now = new Date().toISOString();
    if (isPoster) {
      currentHandover.poster_confirmed = true;
      currentHandover.poster_confirmed_at = now;
    } else {
      currentHandover.claimant_confirmed = true;
      currentHandover.claimant_confirmed_at = now;
    }

    const isFullyCompleted = currentHandover.poster_confirmed && currentHandover.claimant_confirmed;

    if (isFullyCompleted) {
      currentHandover.completed_at = now;
      if (claim.meetup) {
        claim.meetup.status = "completed";
      }
      // Auto-resolve item
      await ItemsService.update(claim.item_id, { status: "resolved" }, userToken);
    }

    const updatedClaim = store.updateClaim(claimId, {
      handover: currentHandover,
      status: isFullyCompleted ? "approved" : claim.status,
      meetup: claim.meetup,
    });

    return { claim: updatedClaim, isFullyCompleted };
  }
}
