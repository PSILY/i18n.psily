# Translation Management System - psilyou Platform

## Overview
A centralized translation management system for managing multi-language content across multiple psilyou platform projects with AI-powered translations. This admin tool connects to a Supabase database and provides a clean interface for managing translations across 5+ languages and multiple namespaces.

**Business Vision:** To streamline multi-language content management for the psilyou platform, enhancing global reach and user experience through efficient, AI-augmented translation workflows.

## User Preferences
I want iterative development. I prefer detailed explanations. Ask before making major changes.

## System Architecture

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

**`translations` table:**
- `key` (VARCHAR 255): translation key (e.g., "dashboard.welcome_title")
- `locale` (VARCHAR 10): language code (da, en, sv, de, no)
- `text` (TEXT): the translated content
- `namespace` (VARCHAR 50): project identifier (e.g., "my-psilyou-dashboard")
- `reviewed` (BOOLEAN): false for AI drafts, true for human-reviewed
- `updated_at` (TIMESTAMP)
- PRIMARY KEY (`key`, `locale`, `namespace`)

**`languages` table:**
- `locale` (VARCHAR 10) PRIMARY KEY
- `name` (VARCHAR 50)
- `native_name` (VARCHAR 50)
- `status` (VARCHAR 20): 'draft', 'live', 'archived' (global status)
- `completion_percent` (INT): global completion (not used for namespace-specific status)
- `display_order` (INT)
- `updated_at` (TIMESTAMP)

**Note:** Language status and completion percentage are calculated **dynamically per namespace** based on translation coverage. When querying languages with a `namespace` parameter, the API calculates:
- `completionPercent`: `(translations in target language / translations in English) * 100` for that namespace
- `status`: Automatically set to 'live' if completion ≥ 95%, otherwise 'draft'

### System Design Choices

**1. Translation Management UI:**
- 3-column layout grouped by translation key (`namespace::key` composite grouping).
- Column 1: Translation key, namespace, and English reference text.
- Column 2: All other languages as editable textarea inputs stacked vertically.
- Column 3: Review status badges with instant toggle functionality.
- Debounced autosave (1 second delay) and immediate save on blur.
- Filtering by namespace, locale, and review status; search by key or text content.

**2. Language Management (Namespace-Aware):**
- Shared namespace selector with localStorage persistence.
- Grid of language cards showing completion statistics **per selected namespace**.
- Ability to add new languages (creates draft status) and archive unused ones.
- AI translate all keys in a namespace.
- Language status automatically promoted to 'live' when ≥ 95% complete in that namespace.
- A language can be 'live' in one namespace and 'draft' in another.

**3. AI Translation:**
- Bulk translation from English to target languages using OpenAI.
- Context-aware translations.
- All AI translations are initially marked as `reviewed=false`.
- Includes rate limiting and retry logic for API calls.

**4. Analytics Dashboard:**
- Displays total keys, languages, and average completion statistics.
- Completion by namespace with progress bars.
- Feed of recently updated translations.
- List of untranslated keys grouped by namespace.

**5. Authentication (Local Handoff Redemption):**
- Uses handoff codes from `psilyou.com` with **local redemption endpoint**.
- Application receives `handoff` codes via URL parameter (e.g., `?handoff=CODE`).
- Redeems codes via **local** `/api/auth/redeem-handoff/:code` endpoint.
- Local endpoint queries **shared Supabase** `handoff_tokens` table directly.
- Issues JWT using **shared JWT_SECRET** (must match across all Repls).
- Stores JWT in localStorage and uses it for all API calls.
- Backend validates JWT for `admin` access (`sub_type === 2`).
- Public endpoints (`/api/languages`, `/api/translations/:locale/:namespace`) do not require authentication.
- Background cleanup job removes expired handoff tokens every 5 minutes.

### Design System

**Colors (psilyou brand):**
- Primary: Orange (24 95% 53%)
- Secondary: Blue accent (210 18% 95%)
- Completion indicators: Green (95%+), Blue (70-94%), Amber (40-69%), Muted (<40%).

**Typography:**
- Inter for all text.
- JetBrains Mono for translation keys and locale codes.
- Heading sizes: 2xl (page titles), lg (section headers), base (card titles).
- Body: sm (14px) for data tables, xs (12px) for metadata.

## API Reference

### Public Endpoints (No Authentication)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/languages?namespace=X` | GET | Get live languages for a namespace (for language switchers) |
| `/api/translations/:locale/:namespace` | GET | Get all translations for a locale/namespace (for i18next) |
| `/api/translations/missing` | POST | Log missing translation keys from client apps |

### Service-to-Service Endpoints (API Key Authentication)

These endpoints allow other psilyou Repls to register translation keys automatically.

**Authentication:** Include `x-api-key` header with `I18N_SERVICE_API_KEY` value.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/service/translations/register` | POST | Bulk register translation keys |
| `/api/service/translations/register-single` | POST | Register a single translation key |
| `/api/service/languages?namespace=X` | GET | Get languages with detailed status for a namespace |

#### Bulk Register Keys

```javascript
// POST /api/service/translations/register
// Headers: { "x-api-key": "YOUR_I18N_SERVICE_API_KEY" }
{
  "namespace": "liv-psilyou",
  "keys": [
    { "key": "buttons.submit", "text": "Submit" },
    { "key": "messages.success", "text": "Operation successful" }
  ]
}

// Response:
{
  "message": "Registered 2 keys, skipped 0 existing keys",
  "created": ["buttons.submit", "messages.success"],
  "skipped": [],
  "failed": [],
  "namespace": "liv-psilyou"
}
```

#### Register Single Key

```javascript
// POST /api/service/translations/register-single
// Headers: { "x-api-key": "YOUR_I18N_SERVICE_API_KEY" }
{
  "namespace": "liv-psilyou",
  "key": "buttons.submit",
  "text": "Submit",
  "locale": "en" // optional, defaults to "en"
}

// Response:
{
  "message": "Translation created",
  "translation": { ... },
  "action": "created" // or "updated" if key already existed
}
```

### Admin Endpoints (JWT Authentication)

These require Bearer token from handoff authentication.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/translations` | GET | Get translations with filters |
| `/api/admin/translations` | POST | Create a translation |
| `/api/admin/translations/:key/:locale/:namespace` | PATCH | Update a translation |
| `/api/admin/translations/:key/:locale/:namespace` | DELETE | Delete a translation |
| `/api/admin/translations/ai-translate` | POST | Bulk AI translate for namespace |
| `/api/admin/translations/ai-translate-single` | POST | AI translate single key |
| `/api/admin/languages` | GET | Get all languages with namespace status |
| `/api/admin/analytics` | GET | Get analytics data |

## External Dependencies

- **Supabase:** PostgreSQL database for all translation data and handoff token redemption.
- **OpenAI:** Used for AI translation services via Replit AI Integrations.
- **psilyou.com:** Creates handoff tokens and redirects users with `?handoff=CODE`.

## Integration Guide for Other Repls

### Setup in Other Repls

1. Add `I18N_SERVICE_API_KEY` as a secret (same value as this Repl)
2. Create an i18n client module:

```javascript
// lib/i18n-client.js
const I18N_API_URL = "https://i18n.psilyou.com";
const API_KEY = process.env.I18N_SERVICE_API_KEY;

export async function registerTranslationKeys(namespace, keys) {
  const response = await fetch(`${I18N_API_URL}/api/service/translations/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY
    },
    body: JSON.stringify({ namespace, keys })
  });
  return response.json();
}

export async function getLanguages(namespace) {
  const response = await fetch(`${I18N_API_URL}/api/languages?namespace=${namespace}`);
  return response.json();
}

export async function getTranslations(locale, namespace) {
  const response = await fetch(`${I18N_API_URL}/api/translations/${locale}/${namespace}`);
  return response.json();
}
```

### Usage in admin.psilyou.com

When creating topics/questions, register the translation keys:

```javascript
// After creating a topic with slug "grief"
await registerTranslationKeys("liv-psilyou", [
  { key: "topics.grief.name", text: "Grief & Loss" },
  { key: "topics.grief.description", text: "Understanding and navigating..." }
]);
```

### Usage in liv.psilyou.com

Fetch translations at runtime:

```javascript
const translations = await getTranslations("da", "liv-psilyou");
// Returns: { "buttons.yes": "Ja", "topics.grief.name": "Sorg og tab", ... }
```