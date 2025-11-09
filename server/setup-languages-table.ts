import { Client } from "pg";

// This script creates the languages table in your Supabase database
// Run with: npx tsx server/setup-languages-table.ts

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  process.exit(1);
}

async function createLanguagesTable() {
  // Extract the database connection string from Supabase URL
  // Format: https://[project-ref].supabase.co → postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
  const projectRef = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");
  
  console.log("⚠️  Note: This script requires your Supabase database password");
  console.log("📝 Please run the following SQL in your Supabase SQL Editor instead:\n");
  
  const sql = `
-- Create languages table
CREATE TABLE IF NOT EXISTS languages (
  locale VARCHAR(10) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  native_name VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  completion_percent INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed initial languages
INSERT INTO languages (locale, name, native_name, status, completion_percent, display_order)
VALUES 
  ('en', 'English', 'English', 'live', 100, 1),
  ('da', 'Danish', 'Dansk', 'draft', 0, 2),
  ('sv', 'Swedish', 'Svenska', 'draft', 0, 3),
  ('de', 'German', 'Deutsch', 'draft', 0, 4),
  ('no', 'Norwegian', 'Norsk', 'draft', 0, 5)
ON CONFLICT (locale) DO NOTHING;
`;

  console.log(sql);
  console.log("\n📍 Instructions:");
  console.log("1. Go to https://app.supabase.com");
  console.log("2. Select your project");
  console.log("3. Click 'SQL Editor' in the sidebar");
  console.log("4. Click 'New Query'");
  console.log("5. Copy and paste the SQL above");
  console.log("6. Click 'Run' or press Cmd/Ctrl+Enter");
  console.log("\n✅ After running this, your app will be fully functional!\n");
}

createLanguagesTable().catch(console.error);
