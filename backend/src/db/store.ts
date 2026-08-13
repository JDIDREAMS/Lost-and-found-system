import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  studentId?: string | null;
  isStudentVerified: boolean;
  role: "user" | "admin" | "moderator";
  createdAt: string;
  resetToken?: string | null;
  resetTokenExpires?: number | null;
}

export interface ItemRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  item_type: "lost" | "found";
  location: string;
  date_occurred: string;
  image_url: string | null; // single URL or JSON array of URLs
  status: "open" | "claimed" | "resolved";
  contact_info: string | null;
  posted_by: string | null;
  poster_name: string;
  created_at: string;
  updated_at: string;
}

export interface ClaimRecord {
  id: string;
  item_id: string;
  claimant_id: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface MessageRecord {
  id: string;
  claim_id: string;
  sender_id: string;
  text: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  text: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  items: ItemRecord[];
  claims: ClaimRecord[];
  messages: MessageRecord[];
  notifications: NotificationRecord[];
}

const DATA_DIR = path.join(__dirname, "../../data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const SEED_ITEMS: ItemRecord[] = [
  {
    id: "item-1",
    title: "Black leather wallet",
    description: "Slim bifold wallet with a student ID inside and a few loyalty cards. No cash.",
    category: "Wallets",
    item_type: "found",
    location: "Central Library, 2nd floor",
    date_occurred: "2026-07-28",
    image_url:
      "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80",
    status: "open",
    contact_info: "priya@example.com",
    posted_by: "demo-user-1",
    poster_name: "Priya N.",
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "item-2",
    title: 'Silver MacBook Air 13"',
    description:
      "Laptop in a navy sleeve with a sticker of a mountain on the lid. Password protected.",
    category: "Electronics",
    item_type: "lost",
    location: "Bus route 14, near City Square",
    date_occurred: "2026-07-30",
    image_url:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80",
    status: "open",
    contact_info: "arun@example.com",
    posted_by: "demo-user-2",
    poster_name: "Arun K.",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "item-3",
    title: "Set of house keys",
    description: "Three keys on a red carabiner with a small bottle-opener charm.",
    category: "Keys",
    item_type: "found",
    location: "Riverside Park, near the fountain",
    date_occurred: "2026-08-01",
    image_url:
      "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80",
    status: "open",
    contact_info: "maya@example.com",
    posted_by: "demo-user-3",
    poster_name: "Maya R.",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "item-4",
    title: 'Golden retriever, collar "Biscuit"',
    description: "Friendly dog, wearing a brown collar with the name Biscuit. Very calm.",
    category: "Pets",
    item_type: "found",
    location: "Elm Street playground",
    date_occurred: "2026-07-31",
    image_url:
      "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&auto=format&fit=crop&q=80",
    status: "claimed",
    contact_info: "daniel@example.com",
    posted_by: "demo-user-4",
    poster_name: "Daniel O.",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "item-5",
    title: "Blue Jansport backpack",
    description: "Contains textbooks and a scientific calculator. Small tear on the left strap.",
    category: "Bags",
    item_type: "lost",
    location: "Engineering Block, Room 204",
    date_occurred: "2026-07-26",
    image_url:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
    status: "open",
    contact_info: "sofia@example.com",
    posted_by: "demo-user-5",
    poster_name: "Sofia M.",
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
];

class Store {
  private db: DatabaseSchema = {
    users: [],
    items: SEED_ITEMS,
    claims: [],
    messages: [],
    notifications: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, "utf-8");
        const loaded = JSON.parse(content) as Partial<DatabaseSchema>;
        this.db = {
          users: loaded.users ?? [],
          items: loaded.items?.length ? loaded.items : SEED_ITEMS,
          claims: loaded.claims ?? [],
          messages: loaded.messages ?? [],
          notifications: loaded.notifications ?? [],
        };
      } else {
        this.save();
      }
    } catch (err) {
      console.error("Error initializing DB store:", err);
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const dataStr = JSON.stringify(this.db, null, 2);
      try {
        const tmpFile = DB_FILE + ".tmp";
        fs.writeFileSync(tmpFile, dataStr, "utf-8");
        fs.renameSync(tmpFile, DB_FILE);
      } catch {
        // Fallback for Windows/OneDrive file lock issues
        fs.writeFileSync(DB_FILE, dataStr, "utf-8");
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error saving DB store:`, err);
    }
  }

  // User operations
  public getUsers() {
    return this.db.users;
  }

  public getUserById(id: string) {
    return this.db.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string) {
    return this.db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserByResetToken(token: string) {
    return this.db.users.find(
      (u) => u.resetToken === token && u.resetTokenExpires && u.resetTokenExpires > Date.now(),
    );
  }

  public addUser(user: UserRecord) {
    this.db.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<UserRecord>) {
    const user = this.getUserById(id);
    if (!user) return null;
    Object.assign(user, updates);
    this.save();
    return user;
  }

  // Item operations
  public getItems() {
    return this.db.items;
  }

  public getItemById(id: string) {
    return this.db.items.find((i) => i.id === id);
  }

  public addItem(item: ItemRecord) {
    this.db.items.unshift(item);
    this.save();
    return item;
  }

  public updateItem(id: string, updates: Partial<ItemRecord>) {
    const item = this.getItemById(id);
    if (!item) return null;
    Object.assign(item, updates, { updated_at: new Date().toISOString() });
    this.save();
    return item;
  }

  public deleteItem(id: string) {
    const index = this.db.items.findIndex((i) => i.id === id);
    if (index !== -1) {
      this.db.items.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // Claim operations
  public getClaims() {
    return this.db.claims;
  }

  public getClaimById(id: string) {
    return this.db.claims.find((c) => c.id === id);
  }

  public addClaim(claim: ClaimRecord) {
    this.db.claims.unshift(claim);
    this.save();
    return claim;
  }

  public updateClaim(id: string, updates: Partial<ClaimRecord>) {
    const claim = this.getClaimById(id);
    if (!claim) return null;
    Object.assign(claim, updates);
    this.save();
    return claim;
  }

  // Message operations
  public getMessagesByClaimId(claimId: string) {
    return this.db.messages.filter((m) => m.claim_id === claimId);
  }

  public addMessage(message: MessageRecord) {
    this.db.messages.push(message);
    this.save();
    return message;
  }

  // Notification operations
  public getNotificationsByUserId(userId: string) {
    return this.db.notifications.filter((n) => n.user_id === userId);
  }

  public addNotification(notification: NotificationRecord) {
    this.db.notifications.unshift(notification);
    this.save();
    return notification;
  }

  public markNotificationRead(id: string, userId: string) {
    const notif = this.db.notifications.find((n) => n.id === id && n.user_id === userId);
    if (notif) {
      notif.is_read = true;
      this.save();
      return notif;
    }
    return null;
  }
}

export const store = new Store();
