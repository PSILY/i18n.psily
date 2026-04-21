import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "public",
  },
});

// Utility to convert snake_case to camelCase
export function toCamelCase<T = any>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => toCamelCase(item)) as T;
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any) as T;
  }
  return obj;
}

// Utility to convert camelCase to snake_case
export function toSnakeCase<T = any>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => toSnakeCase(item)) as T;
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {} as any) as T;
  }
  return obj;
}

// Database initialization script
export async function initializeDatabase() {
  const createTablesSQL = `
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

    -- Create translations table
    CREATE TABLE IF NOT EXISTS translations (
      key VARCHAR(255) NOT NULL,
      locale VARCHAR(10) NOT NULL,
      text TEXT NOT NULL,
      namespace VARCHAR(50) NOT NULL,
      reviewed BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (key, locale, namespace)
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_translations_namespace ON translations(namespace);
    CREATE INDEX IF NOT EXISTS idx_translations_locale ON translations(locale);
    CREATE INDEX IF NOT EXISTS idx_translations_reviewed ON translations(reviewed);
    CREATE INDEX IF NOT EXISTS idx_translations_updated_at ON translations(updated_at DESC);
  `;

  try {
    // Execute the SQL to create tables
    const { error } = await supabase.rpc("exec_sql", { sql: createTablesSQL });
    if (error) {
      // If RPC doesn't exist, log and continue (tables should be created manually)
      console.log("Note: Please run database-setup.sql in Supabase SQL Editor to create tables");
    }
    return createTablesSQL;
  } catch (error) {
    console.log("Note: Please run database-setup.sql in Supabase SQL Editor to create tables");
    return createTablesSQL;
  }
}

// Create languages table and seed initial data
export async function seedLanguages() {
  // First, try to create the table using raw SQL via Supabase REST API
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS languages (
      locale VARCHAR(10) PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      native_name VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      completion_percent INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  try {
    // Execute the CREATE TABLE SQL directly using Supabase client
    // Note: This uses the query builder which may not support DDL
    // If it fails, the table might already exist or we need to use REST API
    const { error: createError } = await supabase.rpc('exec', { sql: createTableSQL });
    if (createError) {
      console.log("Note: Could not create table via RPC, attempting to seed anyway...");
    }
  } catch (e) {
    console.log("Note: Proceeding to seed languages...");
  }

  // Seed initial language data
  const initialLanguages = [
    {
      locale: "en",
      name: "English",
      native_name: "English",
      status: "live",
      completion_percent: 100,
      display_order: 1,
    },
    {
      locale: "da",
      name: "Danish",
      native_name: "Dansk",
      status: "draft",
      completion_percent: 0,
      display_order: 2,
    },
    {
      locale: "sv",
      name: "Swedish",
      native_name: "Svenska",
      status: "draft",
      completion_percent: 0,
      display_order: 3,
    },
    {
      locale: "de",
      name: "German",
      native_name: "Deutsch",
      status: "draft",
      completion_percent: 0,
      display_order: 4,
    },
    {
      locale: "no",
      name: "Norwegian",
      native_name: "Norsk",
      status: "draft",
      completion_percent: 0,
      display_order: 5,
    },
  ];

  for (const lang of initialLanguages) {
    const { error } = await supabase
      .from("languages")
      .upsert(lang, { onConflict: "locale" });

    if (error) {
      console.error(`Error seeding language ${lang.locale}:`, error.message);
      throw new Error(`Failed to seed languages: ${error.message}`);
    }
  }

  console.log("✅ Languages seeded successfully");
}
