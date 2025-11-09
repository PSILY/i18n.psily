# Database Setup Instructions

This translation management system requires database tables in your existing Supabase instance.

## Option 1: Run SQL Script (Recommended)

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `database-setup.sql`
4. Paste and execute the SQL script
5. Verify that the `languages` and `translations` tables were created

## Option 2: Use the API Endpoint

The application provides a setup endpoint, but it only seeds languages. You'll still need to create the tables manually in Supabase.

```bash
curl -X POST http://localhost:5000/api/setup/init-db
```

## Verify Setup

After running the SQL script, you should have:

- **languages table** with 5 initial languages:
  - en (English) - live status, 100% complete
  - da (Danish) - draft status
  - sv (Swedish) - draft status
  - de (German) - draft status
  - no (Norwegian) - draft status

- **translations table** with sample English translations in two namespaces:
  - `my-psilyou-dashboard` (5 keys)
  - `main-site` (3 keys)

## Next Steps

Once the database is set up:

1. The application will automatically connect using your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. You can start managing translations through the web interface
3. Use the AI translation feature to generate translations for other languages
4. Review and edit AI-generated translations
5. Promote languages to "live" status when ready

## Authentication

All admin routes require a valid JWT token from your admin.psilyou.com system. Include it in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

The public endpoints (`/api/languages` and `/api/translations/:locale/:namespace`) don't require authentication.
