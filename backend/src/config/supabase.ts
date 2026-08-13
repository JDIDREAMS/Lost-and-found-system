import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Use service role key if provided (for admin bypass), otherwise fallback to publishable key
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

export const supabaseAdmin = createClient(env.SUPABASE_URL, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Creates a scoped Supabase client with a user's JWT token to enforce Row Level Security
 */
export function createScopedClient(userToken: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
