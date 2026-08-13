import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema, updatePasswordSchema } from "../schemas/auth.schema";
import { itemSchema } from "../schemas/item.schema";
import { claimSchema } from "../schemas/claim.schema";

describe("Validation Schemas", () => {
  describe("Authentication Schemas", () => {
    it("validates correct login credentials", () => {
      const valid = loginSchema.safeParse({
        email: "student@knust.edu",
        password: "password123",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects invalid email formats", () => {
      const invalid = loginSchema.safeParse({
        email: "notanemail",
        password: "password123",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates student registration payload", () => {
      const valid = registerSchema.safeParse({
        name: "Benedict Okai",
        email: "benedict@knust.edu",
        password: "securepassword",
        studentId: "21036275",
      });
      expect(valid.success).toBe(true);
    });

    it("enforces matching passwords on password reset", () => {
      const mismatched = updatePasswordSchema.safeParse({
        password: "password123",
        confirmPassword: "password456",
      });
      expect(mismatched.success).toBe(false);

      const matched = updatePasswordSchema.safeParse({
        password: "password123",
        confirmPassword: "password123",
      });
      expect(matched.success).toBe(true);
    });
  });

  describe("Item Schema", () => {
    it("validates a complete lost item submission", () => {
      const valid = itemSchema.safeParse({
        title: "Lost Blue Backpack",
        category: "Bags",
        item_type: "lost",
        description: "Contains textbooks and a calculator left in Room 204",
        location: "Engineering Block",
        date_occurred: "2026-08-13",
        contact_info: "owner@knust.edu",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects items with descriptions that are too short", () => {
      const invalid = itemSchema.safeParse({
        title: "Keys",
        category: "Keys",
        item_type: "found",
        description: "found", // too short (< 10 chars)
        location: "Library",
        date_occurred: "2026-08-13",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("Claim Schema", () => {
    it("validates legitimate claim message with sufficient details", () => {
      const valid = claimSchema.safeParse({
        message: "This is my student ID card. My index number is 21036275.",
      });
      expect(valid.success).toBe(true);
    });

    it("validates structured proof of ownership fields", () => {
      const valid = claimSchema.safeParse({
        brand: "Apple",
        unique_marks: "Sticker of a cat on the back right corner",
        contents_description: "Contains student card and gym pass",
        serial_fragment: "Last 4 digits: 9021",
        message: "I lost this laptop on Thursday in the library study room.",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects vague or single-word claims", () => {
      const invalid = claimSchema.safeParse({
        message: "mine",
      });
      expect(invalid.success).toBe(false);
    });
  });
});
