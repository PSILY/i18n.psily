-- Create languages table in your Supabase database
-- This table is needed to complete the translation management system

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

-- Verify the table was created
SELECT * FROM languages ORDER BY display_order;
