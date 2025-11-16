# Translation Management System - psilyou Platform

## Overview
A centralized translation management system for managing multi-language content across multiple psilyou platform projects with AI-powered translations. This admin tool connects to a Supabase database and provides a clean interface for managing translations across 5+ languages and multiple namespaces.

## Project Status
**Current Phase:** Production Ready ✅
- ✅ Data models and TypeScript interfaces defined
- ✅ Design system configured with psilyou brand colors (orange primary, blue outline secondary)
- ✅ All React components built with sidebar navigation
- ✅ Backend implementation complete (Supabase, JWT auth, OpenAI integration)
- ✅ Frontend integrated with backend APIs using TanStack Query
- ✅ Database tables created and seeded in Supabase
- ✅ Snake_case ↔ camelCase conversion implemented for all CRUD operations
- ✅ All features tested and working with real data

## Architecture

### Tech Stack
**Frontend:**
- React 18 with TypeScript
- Wouter for routing
- TanStack Query v5 for data fetching
- Shadcn UI components with Tailwind CSS
- Inter font for clean data-dense interfaces
- Dark mode support

**Backend:**
- Express.js
- Supabase (PostgreSQL) for data persistence
- JWT authentication (tokens from admin.psilyou.com)
- OpenAI via Replit AI Integrations for translations
- p-limit and p-retry for batch processing with rate limiting

### Database Schema

**translations table:**
- key (VARCHAR 255) - translation key like "dashboard.welcome_title"
- locale (VARCHAR 10) - language code: da, en, sv, de, no
- text (TEXT) - the translated content
- namespace (VARCHAR 50) - project identifier: "my-psilyou-dashboard", "main-site", etc.
- reviewed (BOOLEAN) - false for AI drafts, true for human-reviewed
- updated_at (TIMESTAMP)
- PRIMARY KEY (key, locale, namespace)

**languages table:**
- locale (VARCHAR 10) PRIMARY KEY
- name (VARCHAR 50) - English name
- native_name (VARCHAR 50) - Native name
- status (VARCHAR 20) - global status: 'draft', 'live', 'archived' (for basic language availability)
- completion_percent (INT) - global completion (not used for namespace-specific status)
- display_order (INT) - sort order
- updated_at (TIMESTAMP)

**Note:** Language status and completion percentage are calculated **dynamically per namespace** based on translation coverage. When querying languages with `namespace` parameter, the API calculates:
- `completionPercent`: `(translations in target language / translations in English) * 100` for that namespace
- `status`: Automatically set to 'live' if completion ≥ 95%, otherwise 'draft'

### Project Structure
```
client/
├── src/
│   ├── components/
│   │   ├── app-sidebar.tsx - Main navigation sidebar
│   │   ├── theme-toggle.tsx - Dark/light mode toggle
│   │   └── ui/ - Shadcn components
│   ├── pages/
│   │   ├── translations.tsx - Main translation management page
│   │   ├── languages.tsx - Language management with AI translation
│   │   ├── analytics.tsx - Analytics dashboard
│   │   └── not-found.tsx - 404 page
│   ├── App.tsx - Main app with sidebar layout
│   └── index.css - Design system tokens
shared/
└── schema.ts - Shared TypeScript types and Zod schemas
server/
├── routes.ts - API endpoints (to be implemented)
├── storage.ts - Supabase integration (to be implemented)
└── lib/
    ├── supabase.ts - Supabase client (to be implemented)
    ├── auth.ts - JWT middleware (to be implemented)
    └── openai.ts - AI translation service (to be implemented)
```

## Features

### 1. Translation Management UI (Redesigned ✨)
- **3-column layout grouped by translation key** (namespace::key composite grouping)
  - Column 1: Translation key, namespace, and English reference text
  - Column 2: All other languages as editable textarea inputs stacked vertically
  - Column 3: Review status badges with instant toggle functionality
- **Debounced autosave** - saves 1 second after typing stops, or immediately on blur
- Filter by namespace, locale, and review status
- Search by key or text content
- Inline editing with real-time feedback
- One-click review status toggle per language
- Beautiful loading, error, and empty states
- Responsive card-based layout

### 2. Language Management (Namespace-Aware)
- **Shared namespace selector** with localStorage persistence and validation
- Grid of language cards showing completion stats **per selected namespace**
- Add new language (creates draft status)
- AI translate all keys in a namespace
- Language status automatically promoted to 'live' when 95%+ complete in that namespace
- Archive unused languages
- Progress bars showing completion percentage for the selected namespace
- **Production-ready error handling** - distinct error/empty states with retry buttons
- **Key feature:** Same language can be 'live' in one namespace and 'draft' in another

### 3. AI Translation (OpenAI)
- Bulk translate from English to target language
- Context-aware translations
- Mark all AI translations as reviewed=false
- Rate limiting and retry logic for API calls

### 4. Analytics Dashboard
- Total keys, languages, average completion stats
- Completion by namespace with progress bars
- Recently updated translations feed
- List of untranslated keys grouped by namespace

### 5. API Endpoints (Public)
- GET /api/languages - returns only status='live' languages
- GET /api/translations/:locale/:namespace - translations for i18next

### 6. API Endpoints (Admin)
- GET /api/admin/languages - all languages
- GET /api/admin/namespaces - list of all namespaces
- GET /api/admin/translations?filters - filtered translations
- POST /api/admin/translations - create translation
- PATCH /api/admin/translations/:key/:locale/:namespace - update translation
- POST /api/admin/translations/ai-translate - trigger AI translation
- GET /api/admin/analytics - analytics data

## Authentication
- JWT token validation expecting tokens from admin.psilyou.com
- All /api/admin/* routes require valid JWT
- Public /api/languages and /api/translations/* endpoints are open

## Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (bypasses RLS)
- `JWT_SECRET` - Secret for validating JWT tokens from admin.psilyou.com
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Auto-set by Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Auto-set by Replit AI Integrations

## Design System

### Colors (psilyou brand)
- Primary: Orange (24 95% 53%) - for main actions
- Secondary: Blue accent (210 18% 95%) - for outline buttons
- Completion indicators:
  - 95%+: Green
  - 70-94%: Blue
  - 40-69%: Amber
  - <40%: Muted

### Typography
- Font: Inter for all text
- Mono: JetBrains Mono for translation keys and locale codes
- Heading sizes: 2xl (page titles), lg (section headers), base (card titles)
- Body: sm (14px) for data tables, xs (12px) for metadata

### Component Usage
- Sidebar: Fixed width navigation with icon + label items
- Tables: Striped rows with inline editing
- Cards: Language cards, stat cards, analytics sections
- Badges: Status indicators (draft/live/archived), locale codes
- Progress bars: Completion percentages
- Dialogs: Add language, AI translation settings

## Initial Data
5 languages to be seeded in draft mode:
- da (Dansk/Danish) - primary target
- en (English) - source language
- sv (Svenska/Swedish)
- de (Deutsch/German)
- no (Norsk/Norwegian)

## Recent Changes
- 2025-11-16: **Production Authentication Implementation** 🔐
  - Implemented complete JWT authentication flow for admin.psilyou.com integration
  - Backend validates JWT with sub_type === 2 for admin access
  - Frontend extracts token from URL (?token=) and stores in localStorage
  - Fixed base64url decoding to properly handle real JWT tokens
  - Added TokenHandler component with loading state and redirect logic
  - Mock tokens only work in development mode (production requires real JWT)
  - User info display in sidebar footer shows authenticated user's name and email
  - Production-ready: Works correctly when deployed to i18n.psilyou.com
  - Architect-reviewed and confirmed production-ready ✅

- 2025-11-14: **Translations Page Complete UX Redesign** ✨
  - Implemented 3-column card-based layout grouped by translation key
  - Added debounced autosave (1-second delay) for seamless editing experience
  - Immediate save on blur for instant feedback
  - Side-by-side view of English reference and all translations
  - One-click review status toggle per language
  - Composite key grouping (namespace::key) prevents cross-namespace data corruption
  - All changes properly invalidate TanStack Query cache
  - Comprehensive e2e testing with Playwright - all tests passing ✅

- 2025-11-14: **Shared Namespace Selector Implementation**
  - Created reusable `useNamespaceSelector` hook with localStorage persistence
  - Auto-hydrates from localStorage on page load
  - Validates persisted namespace against fetched list (clears if invalid)
  - Configurable `autoSelect` and `persist` options
  - Integrated into Languages page with namespace-aware queries
  - Integrated into Translations page with "All Namespaces" support
  - Production-ready error handling for all failure modes
  - Distinct error states with retry buttons for namespace/language query failures
  - Proper loading skeletons and empty states

- 2025-11-14: **Namespace-aware language status implementation**
  - **Breaking change:** Language status and completion are now calculated **dynamically per namespace**
  - Removed `language_namespaces` junction table - no longer needed with dynamic calculation
  - Each language can have different status/completion % in different namespaces
  - Example: Danish can be 'live' (100%) in "my-psilyou-dashboard" but 'draft' (0%) in "psilyou-website"
  - Simplified architecture: Status calculated on-the-fly from `translations` table counts
  - Fixed Supabase schema cache issues by avoiding separate junction table entirely
  - API now requires `namespace` parameter for accurate language status
  - Status automatically promoted to 'live' when completion ≥ 95% in that namespace
  - Tested and verified with real data: "my-psilyou-dashboard" shows EN 100%, DA/SV 90%, others 0%

- 2025-11-09: Production-ready MVP complete with all features working
  - Initial schema and frontend implementation complete
  - All components built following design_guidelines.md
  - Configured psilyou brand colors and Inter typography
  - Implemented dark mode support
  - Created sidebar navigation with 3 main sections
  - Built complete backend with Supabase integration
  - Implemented JWT authentication middleware with dev mock token support
  - Created OpenAI translation service with batch processing and rate limiting
  - Integrated frontend with backend using TanStack Query
  - Added mutation handlers for CRUD operations
  - Implemented real-time UI updates and optimistic updates
  - Fixed authentication: Added JWT token handling in frontend with mock token for development
  - Fixed data mapping: Implemented bidirectional snake_case ↔ camelCase conversion for all CRUD operations
  - Created languages table in user's Supabase database with 6 languages (en, da, sv, de, no, fr)
  - Fixed completion percentage calculation: Now based on translation coverage (target/English) instead of review status
  - Optimized AI translation: Single completion update at end instead of per-translation
  - Fixed Translations page query parameters: queryClient now properly converts filter objects to URL query strings
  - Tested AI translation end-to-end: Danish and Swedish both at 100% completion with 94 translations each
  - Verified all pages working: Translations (93 rows), Languages (6 cards), Analytics (stats and charts)

## Setup Instructions

### 1. Database Setup
Run the SQL script in your Supabase SQL Editor:
```bash
# Copy contents of database-setup.sql to Supabase SQL Editor and execute
```

This creates:
- `languages` table with 5 initial languages (en, da, sv, de, no)
- `translations` table with sample English translations
- Proper indexes for performance

### 2. Authentication
For development:
- The app uses a mock JWT token (`dev-mock-token`) that bypasses authentication
- In production, users will login through admin.psilyou.com and receive real JWT tokens

### 3. Start the Application
```bash
npm run dev
```

The app will be available at http://localhost:5000

## Testing the Application
1. **Translations Page** (NEW 3-Column Design):
   - View translations grouped by key with English reference
   - Edit any translation inline - auto-saves after 1 second of inactivity
   - Click review badges to instantly toggle review status
   - Filter by namespace, language, review status, or search
   - Experience smooth, modern editing workflow

2. **Languages Page**:
   - Select a namespace from dropdown to view completion stats
   - Add new languages or archive unused ones
   - Trigger AI translation for any language in selected namespace
   - View real-time completion percentages per namespace

3. **Analytics Page**:
   - View overall stats and completion by namespace
   - See recently updated translations
   - Identify untranslated keys grouped by namespace

4. **E2e Testing**:
   - All core functionality verified with Playwright
   - Debounced autosave, review toggles, filtering all tested and working ✅

## Next Steps for Production
1. Replace mock JWT with real authentication from admin.psilyou.com
2. Add user roles and permissions (translator, reviewer, admin)
3. Implement translation history and version control
4. Add batch import/export functionality (CSV/JSON)
5. Set up webhook notifications for cache invalidation
6. Implement translation memory and glossary features
