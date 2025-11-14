-- Migration: Add language_namespaces junction table
-- This makes language status and completion tracking namespace-aware

-- Step 1: Create the language_namespaces junction table
CREATE TABLE IF NOT EXISTS language_namespaces (
  locale VARCHAR(10) NOT NULL,
  namespace VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  completion_percent INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (locale, namespace),
  FOREIGN KEY (locale) REFERENCES languages(locale) ON DELETE CASCADE
);

-- Step 2: Migrate existing language status data to language_namespaces
-- For each existing language with status/completion, create records for all namespaces
INSERT INTO language_namespaces (locale, namespace, status, completion_percent)
SELECT 
  l.locale,
  n.namespace,
  COALESCE(l.status, 'draft') as status,
  COALESCE(l.completion_percent, 0) as completion_percent
FROM languages l
CROSS JOIN (
  SELECT DISTINCT namespace FROM translations
) n
WHERE EXISTS (
  SELECT 1 FROM languages WHERE status IS NOT NULL OR completion_percent IS NOT NULL
)
ON CONFLICT (locale, namespace) DO NOTHING;

-- Step 3: Remove status and completion_percent columns from languages table
ALTER TABLE languages DROP COLUMN IF EXISTS status;
ALTER TABLE languages DROP COLUMN IF EXISTS completion_percent;

-- Step 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_language_namespaces_namespace ON language_namespaces(namespace);
CREATE INDEX IF NOT EXISTS idx_language_namespaces_status ON language_namespaces(status);

-- Verification query to check the migration
-- SELECT ln.locale, ln.namespace, ln.status, ln.completion_percent, l.name
-- FROM language_namespaces ln
-- JOIN languages l ON ln.locale = l.locale
-- ORDER BY ln.namespace, l.display_order;
