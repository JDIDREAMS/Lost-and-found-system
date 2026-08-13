import { ItemsService } from "./items.service.js";
import { NotificationsService } from "./notifications.service.js";
import { ItemRecord } from "../db/store.js";

export interface MatchReason {
  type: "category" | "keywords" | "location" | "date";
  label: string;
  points: number;
}

export interface ScoredMatch {
  item: ItemRecord;
  score: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  breakdown: MatchReason[];
}

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "as", "at", "be", "because", "been", "before", "being", "below",
  "between", "both", "but", "by", "could", "did", "do", "does", "doing", "down",
  "during", "each", "few", "for", "from", "further", "had", "has", "have", "having",
  "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i",
  "if", "in", "into", "is", "it", "its", "itself", "just", "lost", "found", "me",
  "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
  "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same",
  "she", "should", "so", "some", "such", "than", "that", "the", "their", "theirs",
  "them", "themselves", "then", "there", "these", "they", "this", "those", "through",
  "to", "too", "under", "until", "up", "very", "was", "we", "were", "what", "when",
  "where", "which", "while", "who", "whom", "why", "with", "would", "you", "your",
  "yours", "yourself", "yourselves", "please", "someone", "help", "reward"
]);

function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function calculateJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

export class SmartMatcherService {
  /**
   * Compare two items and calculate match score (0-100), confidence level, and explanation breakdown.
   */
  static computeMatch(source: ItemRecord, candidate: ItemRecord): ScoredMatch | null {
    // 1. Must be opposite item types (Lost <-> Found)
    if (source.item_type === candidate.item_type) return null;

    // 2. Both items must still be active (open)
    if (source.status !== "open" || candidate.status !== "open") return null;

    // 3. Do not match items posted by the exact same user
    if (source.posted_by && candidate.posted_by && source.posted_by === candidate.posted_by) {
      return null;
    }

    const breakdown: MatchReason[] = [];
    let totalScore = 0;

    // --- Category Score (Max 30 pts) ---
    const sourceCat = (source.category || "Other").trim().toLowerCase();
    const candCat = (candidate.category || "Other").trim().toLowerCase();
    if (sourceCat === candCat && sourceCat !== "other") {
      totalScore += 30;
      breakdown.push({
        type: "category",
        label: `Exact category match: ${source.category}`,
        points: 30,
      });
    } else if (sourceCat === candCat && sourceCat === "other") {
      totalScore += 15;
      breakdown.push({
        type: "category",
        label: `Matching category: Other`,
        points: 15,
      });
    } else if (
      (sourceCat.includes("electronics") && candCat.includes("phone")) ||
      (sourceCat.includes("card") && candCat.includes("wallet")) ||
      (sourceCat.includes("document") && candCat.includes("card"))
    ) {
      totalScore += 15;
      breakdown.push({
        type: "category",
        label: `Related categories: ${source.category} & ${candidate.category}`,
        points: 15,
      });
    }

    // --- Keyword & Title Similarity (Max 35 pts) ---
    const sourceTitleTokens = tokenize(source.title);
    const candTitleTokens = tokenize(candidate.title);
    const sourceDescTokens = tokenize(source.description || "");
    const candDescTokens = tokenize(candidate.description || "");

    const allSourceTokens = [...sourceTitleTokens, ...sourceDescTokens];
    const allCandTokens = [...candTitleTokens, ...candDescTokens];

    const titleSim = calculateJaccardSimilarity(sourceTitleTokens, candTitleTokens);
    const overallSim = calculateJaccardSimilarity(allSourceTokens, allCandTokens);

    // Direct title token matches
    const sharedTitleTokens = sourceTitleTokens.filter((t) => candTitleTokens.includes(t));
    const sharedTokens = allSourceTokens.filter((t) => allCandTokens.includes(t));
    const uniqueShared = Array.from(new Set(sharedTokens));

    let keywordPoints = 0;
    if (titleSim > 0.4 || sharedTitleTokens.length >= 2) {
      keywordPoints = 35;
    } else if (titleSim > 0.2 || sharedTitleTokens.length === 1) {
      keywordPoints = 25;
    } else if (overallSim > 0.15 || uniqueShared.length >= 2) {
      keywordPoints = 15;
    } else if (uniqueShared.length === 1) {
      keywordPoints = 8;
    }

    if (keywordPoints > 0) {
      totalScore += keywordPoints;
      breakdown.push({
        type: "keywords",
        label:
          uniqueShared.length > 0
            ? `Matching keywords: "${uniqueShared.slice(0, 3).join('", "')}"`
            : `Title & text similarity detected`,
        points: keywordPoints,
      });
    }

    // --- Location Proximity (Max 20 pts) ---
    const sourceLocTokens = tokenize(source.location || "");
    const candLocTokens = tokenize(candidate.location || "");
    const sharedLocTokens = sourceLocTokens.filter((t) => candLocTokens.includes(t));
    const locSim = calculateJaccardSimilarity(sourceLocTokens, candLocTokens);

    let locationPoints = 0;
    if (
      source.location &&
      candidate.location &&
      source.location.trim().toLowerCase() === candidate.location.trim().toLowerCase()
    ) {
      locationPoints = 20;
    } else if (locSim > 0.3 || sharedLocTokens.length >= 1) {
      locationPoints = 15;
    } else if (sourceLocTokens.length > 0 && candLocTokens.length > 0) {
      // Substring check (e.g. "Library 3rd floor" contains "Library")
      const srcL = source.location.toLowerCase();
      const candL = candidate.location.toLowerCase();
      if (srcL.includes(candL) || candL.includes(srcL)) {
        locationPoints = 15;
      }
    }

    if (locationPoints > 0) {
      totalScore += locationPoints;
      breakdown.push({
        type: "location",
        label:
          sharedLocTokens.length > 0
            ? `Common location: ${sharedLocTokens.join(", ")}`
            : `Matching location area`,
        points: locationPoints,
      });
    }

    // --- Date Window Proximity (Max 15 pts) ---
    let datePoints = 0;
    if (source.date_occurred && candidate.date_occurred) {
      const srcDate = new Date(source.date_occurred).getTime();
      const candDate = new Date(candidate.date_occurred).getTime();
      if (!isNaN(srcDate) && !isNaN(candDate)) {
        const diffDays = Math.abs(srcDate - candDate) / (1000 * 60 * 60 * 24);
        if (diffDays <= 2) {
          datePoints = 15;
          breakdown.push({
            type: "date",
            label: `Occurred within 2 days of each other`,
            points: 15,
          });
        } else if (diffDays <= 7) {
          datePoints = 10;
          breakdown.push({
            type: "date",
            label: `Occurred within 1 week of each other`,
            points: 10,
          });
        } else if (diffDays <= 14) {
          datePoints = 5;
          breakdown.push({
            type: "date",
            label: `Occurred within 2 weeks of each other`,
            points: 5,
          });
        }
      }
    }
    totalScore += datePoints;

    // Normalize final score (0 to 100)
    const finalScore = Math.min(100, Math.round(totalScore));
    let confidence: "high" | "medium" | "low" = "low";
    if (finalScore >= 70) {
      confidence = "high";
    } else if (finalScore >= 45) {
      confidence = "medium";
    }

    return {
      item: candidate,
      score: finalScore,
      confidence,
      reasons: breakdown.map((b) => b.label),
      breakdown,
    };
  }

  /**
   * Find and rank all candidate matches for a given item.
   */
  static async findMatchesForItem(
    itemId: string,
    minScore = 40,
  ): Promise<ScoredMatch[]> {
    const source = await ItemsService.getById(itemId);
    if (!source) return [];

    const candidateType = source.item_type === "lost" ? "found" : "lost";
    const allCandidates = await ItemsService.getAll({
      item_type: candidateType,
      status: "open",
    });

    const matches: ScoredMatch[] = [];
    for (const cand of allCandidates) {
      const match = this.computeMatch(source, cand);
      if (match && match.score >= minScore) {
        matches.push(match);
      }
    }

    // Sort by highest score first
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Runs automated matching when a new item is posted, alerting both sides if a high-confidence match is detected.
   */
  static async runAutomatedMatchAlerts(newItem: ItemRecord): Promise<void> {
    try {
      const matches = await this.findMatchesForItem(newItem.id, 70); // High confidence matches >= 70%
      if (matches.length === 0) return;

      for (const match of matches) {
        const candidate = match.item;

        // 1. Notify the owner of the newly posted item
        if (newItem.posted_by) {
          const counterpartType = candidate.item_type === "found" ? "found item" : "lost report";
          await NotificationsService.notify({
            user_id: newItem.posted_by,
            text: `✨ Smart Match (${match.score}% match): A potential ${counterpartType} matching "${newItem.title}" was detected ("${candidate.title}")!`,
            link: `/items/${candidate.id}`,
          });
        }

        // 2. Notify the owner of the existing candidate item
        if (candidate.posted_by && candidate.posted_by !== newItem.posted_by) {
          const newType = newItem.item_type === "found" ? "found item" : "lost report";
          await NotificationsService.notify({
            user_id: candidate.posted_by,
            text: `✨ Smart Match (${match.score}% match): A new ${newType} was posted matching your "${candidate.title}" ("${newItem.title}")!`,
            link: `/items/${newItem.id}`,
          });
        }
      }
    } catch (err) {
      console.error("Smart match auto-alert error:", err);
    }
  }

  /**
   * Get all active smart matches for all open items belonging to a user.
   */
  static async getMatchesForUser(
    userId: string,
  ): Promise<Array<{ sourceItem: ItemRecord; matches: ScoredMatch[] }>> {
    const allItems = await ItemsService.getAll();
    const userItems = allItems.filter(
      (item) => item.posted_by === userId && item.status === "open",
    );

    const results: Array<{ sourceItem: ItemRecord; matches: ScoredMatch[] }> = [];

    for (const item of userItems) {
      const matches = await this.findMatchesForItem(item.id, 45);
      if (matches.length > 0) {
        results.push({
          sourceItem: item,
          matches,
        });
      }
    }

    return results;
  }
}
