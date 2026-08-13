import { supabaseAdmin } from "../config/supabase.js";
import { store } from "../db/store.js";

async function syncAllToSupabase() {
  console.log("=================================================");
  console.log("🚀 Starting Sync from Local db.json to Supabase...");
  console.log("=================================================\n");

  const users = store.getUsers();
  const items = store.getItems();
  const claims = store.getClaims();

  // 1. Sync Users to Supabase Auth & Profiles
  console.log(`👤 Syncing ${users.length} Users...`);
  for (const u of users) {
    try {
      // Check if user exists in Supabase
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(u.id);

      if (!existingUser?.user) {
        // Create user in Supabase Auth with admin API
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          id: u.id,
          email: u.email,
          email_confirm: true,
          user_metadata: {
            display_name: u.displayName,
            student_id: u.studentId || null,
            is_student_verified: u.isStudentVerified,
          },
        });

        if (createErr) {
          console.warn(`  ⚠️ Could not create auth user ${u.email}:`, createErr.message);
        } else {
          console.log(`  ✅ Auth user created: ${u.email} (${newUser.user?.id})`);
        }
      } else {
        console.log(`  ℹ️ User already in Supabase Auth: ${u.email}`);
      }

      // Upsert profile
      const { error: profErr } = await supabaseAdmin.from("profiles").upsert({
        id: u.id,
        display_name: u.displayName,
      });

      if (profErr) {
        console.warn(`  ⚠️ Profile upsert warning for ${u.email}:`, profErr.message);
      }
    } catch (err) {
      console.error(`  ❌ Error syncing user ${u.email}:`, err);
    }
  }

  // 2. Sync Items to Supabase Items table
  console.log(`\n📦 Syncing ${items.length} Items...`);
  for (const item of items) {
    try {
      const { error: itemErr } = await supabaseAdmin.from("items").upsert({
        id: item.id.length === 36 ? item.id : undefined, // Ensure valid UUID format
        title: item.title,
        description: item.description,
        category: item.category,
        item_type: item.item_type,
        location: item.location,
        date_occurred: item.date_occurred,
        image_url: item.image_url,
        status: item.status,
        contact_info: item.contact_info,
        posted_by: item.posted_by?.length === 36 ? item.posted_by : null,
        poster_name: item.poster_name,
        created_at: item.created_at,
        updated_at: item.updated_at,
      });

      if (itemErr) {
        console.warn(`  ⚠️ Item sync warning (${item.title}):`, itemErr.message);
      } else {
        console.log(`  ✅ Item synced: "${item.title}"`);
      }
    } catch (err) {
      console.error(`  ❌ Error syncing item ${item.title}:`, err);
    }
  }

  // 3. Sync Claims to Supabase Claims table
  console.log(`\n📋 Syncing ${claims.length} Claims...`);
  for (const claim of claims) {
    try {
      if (claim.item_id?.length === 36 && claim.claimant_id?.length === 36) {
        const { error: claimErr } = await supabaseAdmin.from("claims").upsert({
          id: claim.id.length === 36 ? claim.id : undefined,
          item_id: claim.item_id,
          claimant_id: claim.claimant_id,
          message: claim.message,
          status: claim.status,
          created_at: claim.created_at,
        });

        if (claimErr) {
          console.warn(`  ⚠️ Claim sync warning:`, claimErr.message);
        } else {
          console.log(`  ✅ Claim synced: ${claim.id}`);
        }
      }
    } catch (err) {
      console.error(`  ❌ Error syncing claim:`, err);
    }
  }

  console.log("\n=================================================");
  console.log("✨ Data synchronization complete!");
  console.log("=================================================");
}

void syncAllToSupabase();
