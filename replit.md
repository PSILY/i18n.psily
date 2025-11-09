# Translation Management System - psilyou Platform

## Overview
A centralized translation management system for managing multi-language content across multiple psilyou platform projects with AI-powered translations. This admin tool connects to a Supabase database and provides a clean interface for managing translations across 5+ languages and multiple namespaces.

## Project Status
**Current Phase:** Integration & Testing
- ✅ Data models and TypeScript interfaces defined
- ✅ Design system configured with psilyou brand colors (orange primary, blue outline secondary)
- ✅ All React components built with sidebar navigation
- ✅ Backend implementation complete (Supabase, JWT auth, OpenAI integration)
- ✅ Frontend integrated with backend APIs using TanStack Query
- ⏳ Testing and validation in progress

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
- status (VARCHAR 20) - 'draft', 'live', 'archived'
- completion_percent (INT) - auto-calculated
- display_order (INT) - sort order
- updated_at (TIMESTAMP)

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

### 1. Translation Management UI
- Filter by namespace, locale, and review status
- Search by key or text content
- Inline editing of translation text
- Mark translations as reviewed
- Beautiful loading, error, and empty states
- Responsive table with pagination

### 2. Language Management
- Grid of language cards showing completion stats
- Add new language (creates draft status)
- AI translate all keys in a namespace
- Promote language from draft → live when 95%+ complete
- Archive unused languages
- Progress bars showing completion percentage

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
- 2025-01-10: Complete MVP implementation with critical fixes
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
  - Fixed data mapping: Implemented snake_case to camelCase conversion for Supabase responses
  - Added comprehensive database setup SQL script

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
1. Navigate to the Translations page to view and edit translations
2. Go to Languages page to manage languages and trigger AI translations
3. Check Analytics page for completion stats and untranslated keys
4. Test the AI translation feature by selecting a namespace and target language

## Next Steps for Production
1. Replace mock JWT with real authentication from admin.psilyou.com
2. Add user roles and permissions (translator, reviewer, admin)
3. Implement translation history and version control
4. Add batch import/export functionality (CSV/JSON)
5. Set up webhook notifications for cache invalidation
6. Implement translation memory and glossary features
