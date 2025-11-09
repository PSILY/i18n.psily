# Translation Management System - Design Guidelines

## Design Approach

**Selected Approach**: Design System - Admin Dashboard Pattern
**Justification**: This is a utility-focused admin tool requiring information density, efficient workflows, and data visualization. Drawing inspiration from Linear, Notion Admin, and Vercel Dashboard for clean data-heavy interfaces.

**Key Principles**:
- Information density without clutter
- Efficient data scanning and editing workflows
- Clear visual hierarchy for complex nested data
- Instant feedback for all interactions

## Core Design Elements

### A. Typography
- **Primary Font**: Inter (Google Fonts) - excellent for data-dense interfaces
- **Headings**: 
  - Page titles: text-2xl font-semibold (24px)
  - Section headers: text-lg font-medium (18px)
  - Card titles: text-base font-medium (16px)
- **Body Text**:
  - Primary content: text-sm (14px) - optimal for tables and lists
  - Secondary/metadata: text-xs (12px)
  - Mono for translation keys: font-mono text-xs

### B. Layout System
**Spacing Units**: Use Tailwind units of **2, 3, 4, 6, 8, 12** consistently
- Component padding: p-4 to p-6
- Section gaps: gap-6 to gap-8
- Page margins: px-6 py-8 on desktop, px-4 py-6 on mobile
- Card spacing: p-4 internal, gap-4 between elements

**Container Strategy**:
- Sidebar navigation: Fixed w-64 on desktop, collapsible on mobile
- Main content area: max-w-7xl mx-auto with px-6
- Data tables: Full container width with horizontal scroll if needed

### C. Component Library

**Navigation**:
- Left sidebar with icon + label navigation items
- Active state: Orange accent border-l-4 with orange/10 background
- Sections: Translations, Languages, Analytics, Settings
- Top bar: Search, user avatar, logout

**Data Tables**:
- Striped rows for readability (even rows with subtle background)
- Sticky header on scroll
- Column headers: Sortable with subtle arrow indicators
- Row actions: Inline edit, review toggle, delete (right-aligned)
- Pagination: Bottom of table, show "Showing X-Y of Z"
- Empty states: Centered with icon + message + action button

**Filters & Search**:
- Filter bar above tables with dropdowns for: Namespace, Locale, Review Status
- Search input: Full-width with search icon, placeholder text
- Active filters: Chips with X to remove, count badge "(3 active)"
- Clear all button when filters applied

**Cards**:
- Language cards: Grid layout (3-4 columns on desktop)
  - Language name + native name
  - Completion percentage with progress bar
  - Status badge (draft/live/archived)
  - Quick actions: Edit, AI Translate, Promote
- Stat cards: 2x2 grid showing key metrics
  - Large number + label + trend indicator

**Forms & Inline Editing**:
- Click-to-edit cells in translation table
- Edit mode: Input expands, Cancel/Save buttons appear
- Review checkbox: Toggle with clear visual feedback
- Bulk actions: Checkbox column, action bar appears when selected

**Buttons**:
- Primary: Orange background (psilyou brand) - for main actions
- Secondary: Blue outline - for alternative actions
- Ghost: Transparent for tertiary actions
- Sizes: Default (px-4 py-2), Small (px-3 py-1.5)
- Icons: Leading icon for actions (plus, sync, check)

**Status Indicators**:
- Badges: Pill-shaped with subtle backgrounds
  - Draft: Yellow/amber tint
  - Live: Green tint
  - Archived: Gray tint
  - Reviewed/Unreviewed: Blue/orange tints
- Progress bars: Orange fill for completion percentage
- Tooltips: Show detailed info on hover

**Modals/Drawers**:
- Slide-over drawer from right for: Edit translation, Add language
- Modal dialogs for: Confirm delete, AI translation settings
- Overlay: Subtle dark backdrop with blur

**Analytics Dashboard**:
- Multi-column layout for charts and stats
- Bar charts: Completion by namespace (horizontal bars)
- List of untranslated keys: Grouped by namespace
- Recent activity feed: Timeline layout with icons

### D. Animations
Use sparingly for state feedback only:
- Skeleton loaders while fetching data
- Fade-in for table rows when filtering
- Slide transitions for drawer open/close
- Checkbox/toggle smooth transitions (150ms)
- NO decorative animations

## Page Layouts

**Translations Page** (Main View):
- Filter bar at top (namespace, locale, status dropdowns + search)
- Data table: Key | Locale | Namespace | Text Preview | Reviewed | Actions
- Inline editing for text field
- Bulk select for marking reviewed

**Languages Page**:
- Grid of language cards showing completion stats
- Add language button (top right)
- Each card: Promote to Live, AI Translate All, Edit buttons

**Analytics Dashboard**:
- 2x2 stat cards at top (Total Keys, Languages, Avg Completion, Reviewed %)
- Completion chart by namespace
- Recently updated translations list
- Untranslated keys grouped by namespace

## Interactions

**Key Workflows**:
- Search/Filter: Instant results as you type (debounced)
- Inline Edit: Click text → Edit → Save with Enter or button
- Bulk Review: Select rows → Mark as Reviewed button in action bar
- AI Translate: Click button → Show progress modal → Refresh table

**Feedback**:
- Toast notifications: Success (green), Error (red), Info (blue)
- Loading states: Spinner or skeleton for async operations
- Optimistic updates: UI updates immediately, rollback on error

## Images
No hero images needed - this is a pure admin interface. Use only:
- Empty state illustrations (simple line drawings)
- Language flag icons (12x12px) next to locale codes
- User avatar in top navigation