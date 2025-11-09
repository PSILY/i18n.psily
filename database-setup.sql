-- Translation Management System Database Setup
-- Run this SQL in your Supabase SQL Editor to create the tables

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

-- Seed initial languages
INSERT INTO languages (locale, name, native_name, status, completion_percent, display_order)
VALUES 
  ('en', 'English', 'English', 'live', 100, 1),
  ('da', 'Danish', 'Dansk', 'draft', 0, 2),
  ('sv', 'Swedish', 'Svenska', 'draft', 0, 3),
  ('de', 'German', 'Deutsch', 'draft', 0, 4),
  ('no', 'Norwegian', 'Norsk', 'draft', 0, 5)
ON CONFLICT (locale) DO NOTHING;

-- Optional: Insert sample English translations for testing
INSERT INTO translations (key, locale, text, namespace, reviewed)
VALUES 
  ('dashboard.welcome_title', 'en', 'Welcome to your dashboard', 'my-psilyou-dashboard', true),
  ('dashboard.welcome_subtitle', 'en', 'Manage your account and settings', 'my-psilyou-dashboard', true),
  ('common.submit', 'en', 'Submit', 'my-psilyou-dashboard', true),
  ('common.cancel', 'en', 'Cancel', 'my-psilyou-dashboard', true),
  ('common.save', 'en', 'Save', 'my-psilyou-dashboard', true),
  ('home.hero_title', 'en', 'Transform your mental wellness journey', 'main-site', true),
  ('home.hero_subtitle', 'en', 'Evidence-based tools for better mental health', 'main-site', true),
  ('home.cta_button', 'en', 'Get Started', 'main-site', true)
ON CONFLICT (key, locale, namespace) DO NOTHING;
