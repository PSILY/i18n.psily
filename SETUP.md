# Translation Management System - Setup Guide

Welcome to the psilyou Translation Management System! This centralized admin tool helps you manage multi-language content across all your Repl projects.

## 🚀 Quick Start

### Step 1: Set Up the Database

The application is **already connected** to your Supabase instance, but you need to create the database tables first.

1. Open your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project
3. Click on the **SQL Editor** tab
4. Copy the contents of `database-setup.sql` from this Repl
5. Paste and execute the SQL script

This will create:
- ✅ `languages` table with 5 initial languages (English, Danish, Swedish, German, Norwegian)
- ✅ `translations` table with sample English translations
- ✅ Performance indexes for fast queries

### Step 2: Verify the Setup

Once the database is set up, the application is ready to use! The server is already running at:

**http://localhost:5000**

## 🎯 What You Can Do Now

### 1. Manage Languages
- View all languages with completion statistics
- Add new languages (like French, Spanish, Italian)
- Update language status (draft → review → live)
- Track translation progress for each language

### 2. Manage Translations
- Browse all translation strings
- Filter by namespace, language, or review status
- Search for specific keys or text
- Create and edit translations inline
- Mark translations as reviewed

### 3. AI-Powered Translation
- Select a namespace (like "main-site" or "my-psilyou-dashboard")
- Choose target languages
- Click "Translate with AI" to generate translations automatically
- Review and edit AI-generated translations before publishing

### 4. Analytics Dashboard
- View overall translation completion
- See which namespaces need work
- Track untranslated keys by namespace
- Monitor language-specific progress

## 🔐 Authentication

**For Development:**
- The app uses a mock JWT token (`dev-mock-token`) for testing
- No login required - just start using the app!

**For Production:**
- Users will log in through admin.psilyou.com
- The system validates real JWT tokens from your admin portal

## 📡 API Endpoints for Other Repls

Your other Repl projects can consume translations using these public endpoints:

### Get Live Languages
```javascript
// GET /api/languages
const response = await fetch('https://your-translation-repl.com/api/languages');
const languages = await response.json();
```

### Get Translations for a Locale/Namespace
```javascript
// GET /api/translations/:locale/:namespace
const response = await fetch('https://your-translation-repl.com/api/translations/da/main-site');
const translations = await response.json();

// Returns: { "key": "translation text", ... }
```

These endpoints:
- ✅ Return only "live" languages
- ✅ Don't require authentication
- ✅ Can be cached by your apps
- ✅ Are optimized for fast reads

## 🎨 Features

- **Centralized Management**: One place to manage all translations across all projects
- **AI Translation**: Bulk translate entire namespaces with OpenAI GPT-5
- **Context-Aware**: AI considers the full namespace for better translations
- **Review Workflow**: Mark translations as reviewed before going live
- **Analytics**: Track completion and identify missing translations
- **Dark Mode**: Full dark mode support
- **Real-time Updates**: Changes appear immediately across all pages
- **Supabase Backend**: Reliable, scalable database
- **RESTful API**: Easy integration with your other Repl projects

## 📊 Sample Data

The database setup includes sample English translations:

**Namespace: my-psilyou-dashboard**
- `dashboard.welcome_title`: "Welcome to your dashboard"
- `dashboard.welcome_subtitle`: "Manage your account and settings"
- `common.submit`: "Submit"
- `common.cancel`: "Cancel"
- `common.save`: "Save"

**Namespace: main-site**
- `home.hero_title`: "Transform your mental wellness journey"
- `home.hero_subtitle`: "Evidence-based tools for better mental health"
- `home.cta_button`: "Get Started"

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-5 via Replit AI Integrations
- **Auth**: JWT tokens from admin.psilyou.com
- **State Management**: TanStack Query (React Query)

## 📝 Next Steps

1. **Run the database setup SQL** (Step 1 above)
2. **Navigate to the Languages page** to see your initial languages
3. **Add some translations** or use the AI translation feature
4. **Review the analytics** to track your progress
5. **Integrate with your other Repls** using the public API endpoints

## 🚨 Troubleshooting

### "Could not find the table 'public.languages'"
- You need to run the database setup SQL in Supabase first
- See Step 1 above

### "401 Unauthorized" on admin endpoints
- Make sure you're in development mode
- The mock token should be automatically attached to all requests

### Translations not appearing
- Check that you've marked the language as "live" status
- Public API only returns live languages and their translations

## 💡 Tips

- **Start with English**: Create all your keys in English first
- **Use AI Translation**: Let AI generate initial translations for all languages
- **Review Before Going Live**: Mark translations as reviewed and set language to "live"
- **Organize by Namespace**: Use clear namespace names like "main-site", "dashboard", "mobile-app"
- **Consistent Keys**: Use dot notation for keys like "section.subsection.key"

---

Need help? Check out the full documentation in `replit.md` or reach out to the psilyou team!
