# Handoff Token Migration Guide
## Migrating from Neon to Supabase for Cross-Repl SSO

**Date**: November 22, 2025  
**Migration**: Handoff Tokens moved from Neon DB to Supabase  
**Impact**: All 7 Repl deployments (psilyou.com, my.psilyou.com, admin.psilyou.com, liv.psilyou.com, pdf.psilyou.com, heartbeat.psilyou.com, i18n.psilyou.com)

---

## 📋 Overview

### What Changed
Previously, handoff tokens were stored in each Repl's local Neon database, which prevented cross-Repl SSO from working. Now, handoff tokens are centralized in the **shared Supabase database** alongside user authentication data.

### Why This Change
- **Cross-Repl SSO**: All deployments can now share handoff tokens for seamless authentication across subdomains
- **Centralized Auth**: All authentication data (users, sessions, tokens) now lives in one place (Supabase)
- **Better Security**: Supabase RLS policies protect handoff tokens alongside user data

### Architecture
```
Before:
├── Neon DB (per-Repl) → handoff_tokens ❌ (isolated, can't share)
└── Supabase → Users, sessions

After:
├── Neon DB (per-Repl) → website content only
└── Supabase (shared) → Users, sessions, handoff_tokens ✅ (shared across all Repls)
```

---

## ✅ Prerequisites

Before starting, ensure you have:

1. **Git Access**: Ability to pull latest code from the main repository
2. **Supabase Access**: Dashboard access to verify the migration
3. **Environment Variables**: All required secrets configured (see section below)

---

## 🔄 Migration Steps

### Step 1: Pull Latest Code

Update your Repl with the latest code that includes the Supabase handoff token implementation:

```bash
git pull origin main
```

**Files Changed**:
- `supabase-auth-package/schema.ts` - Added HandoffTokens table definition
- `supabase-auth-package/auth-storage.ts` - Added handoff token CRUD functions
- `supabase-auth-package/migrations/002_handoff_tokens.sql` - Migration SQL
- `server/handoff-auth.ts` - Refactored to use Supabase instead of Drizzle
- `shared/schema.ts` - Removed handoff_tokens from Neon schema

### Step 2: Verify Environment Variables

Check that your Repl has these secrets configured (via Secrets tab):

**Required Secrets**:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side operations)
- `SUPABASE_ANON_KEY` - Supabase anonymous key (for client-side operations)
- `DATABASE_URL` - Neon database URL (for website content)
- `JWT_SECRET` - JWT signing secret (shared across all Repls)

**How to Check**:
1. Open Replit → Tools → Secrets
2. Verify all above secrets exist
3. If missing, copy from the main psilyou.com Repl

### Step 3: Verify Supabase Migration (One-Time)

**⚠️ IMPORTANT**: The Supabase migration only needs to run ONCE across all Repls (it's already been completed on psilyou.com).

To verify the `handoff_tokens` table exists:

1. Open Supabase Dashboard → Table Editor
2. Look for `handoff_tokens` table
3. Confirm it has these columns:
   - `id` (integer, primary key)
   - `code_hash` (varchar, unique)
   - `user_id` (integer, foreign key to Users)
   - `expires_at` (timestamp)
   - `redeemed_at` (timestamp, nullable)
   - `created_at` (timestamp)
   - `ip_address` (text, nullable)

**If the table doesn't exist** (it should), run the migration manually:

1. Open Supabase Dashboard → SQL Editor → New Query
2. Copy SQL from `supabase-auth-package/migrations/002_handoff_tokens.sql`
3. Run the query

### Step 4: Install Dependencies (if needed)

If you pulled new code, ensure all packages are installed:

```bash
npm install
```

The project already includes all required dependencies:
- `@supabase/supabase-js` - Supabase JavaScript client
- `pg` - PostgreSQL client (used by migration script)

### Step 5: Restart Application

Restart your Repl application to pick up the new handoff token system:

1. Click **Stop** on the running workflow
2. Click **Run** to restart

Or via command line:
```bash
npm run dev
```

### Step 6: Verify Startup

Check the startup logs for confirmation:

✅ **Success indicators**:
```
[HANDOFF] Background cleanup job started (runs every 5 minutes)
✅ Connected to Replit database (website content)
Supabase authentication uses JavaScript client (respects RLS)
```

❌ **Error indicators**:
```
Error: relation "handoff_tokens" does not exist
Failed to start cleanup job
```

If you see errors, the Supabase migration may not have run. See Step 3.

---

## 🧪 Testing the Handoff Flow

After deployment, test the SSO handoff flow:

### Test 1: Create Handoff Token (on psilyou.com)

1. Log in to psilyou.com as a test user
2. Click "Go to Dashboard" or navigate to my.psilyou.com
3. Check browser network tab for `/api/auth/handoff` request
4. Should return `{ handoffCode: "..." }` with a random code

### Test 2: Redeem Handoff Token (on my.psilyou.com)

1. After step 1, you'll be redirected to `my.psilyou.com/auth/callback?code=...`
2. The handoff code should be redeemed automatically
3. User should be logged in on my.psilyou.com
4. Check Supabase Table Editor → handoff_tokens → verify `redeemed_at` is set

### Test 3: Background Cleanup

1. Wait 5 minutes after creating test tokens
2. Check Supabase Table Editor → handoff_tokens
3. Expired tokens (created_at > 60 seconds ago) should be deleted
4. Verify in logs: `[HANDOFF] Cleanup job: Deleted X expired tokens`

---

## 🐛 Troubleshooting

### Issue: "relation handoff_tokens does not exist"

**Cause**: Supabase migration hasn't run  
**Fix**:
1. Open Supabase SQL Editor
2. Run migration from `supabase-auth-package/migrations/002_handoff_tokens.sql`
3. Restart application

### Issue: "SUPABASE_SERVICE_ROLE_KEY is not defined"

**Cause**: Missing environment variable  
**Fix**:
1. Go to Replit → Tools → Secrets
2. Add `SUPABASE_SERVICE_ROLE_KEY` secret (copy from main Repl)
3. Restart application

### Issue: "Failed to create handoff token"

**Cause**: Database permissions or network issue  
**Fix**:
1. Check Supabase RLS policies allow token insertion
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Check server logs for detailed error messages

### Issue: Handoff cleanup job not running

**Cause**: Code not updated or syntax error  
**Fix**:
1. Verify you pulled latest code (`git pull origin main`)
2. Check server startup logs for errors
3. Look for `[HANDOFF] Background cleanup job started`

### Issue: Tokens not being cleaned up

**Cause**: Background job failing silently  
**Fix**:
1. Check server logs every 5 minutes for cleanup messages
2. Verify Supabase connection is working
3. Check for `[HANDOFF] Cleanup job: Deleted X expired tokens`

---

## 📊 Monitoring

After deployment, monitor these metrics:

### Startup Logs
- `[HANDOFF] Background cleanup job started` ✅
- No database connection errors ✅

### Supabase Database
- `handoff_tokens` table exists ✅
- Tokens being created with `redeemed_at = NULL` ✅
- Tokens being marked as redeemed (redeemed_at set) ✅
- Old tokens being cleaned up (< 60 entries typical) ✅

### Application Behavior
- Users can navigate from psilyou.com → my.psilyou.com seamlessly ✅
- No "authentication failed" errors ✅
- Session persists across subdomains ✅

---

## 🔐 Security Notes

### What's Preserved
- ✅ SHA-256 hashing of handoff codes
- ✅ 60-second token expiration
- ✅ 5-second grace period for clock skew
- ✅ Single-use token enforcement (atomic redemption)
- ✅ IP address logging
- ✅ Rate limiting per user

### What Changed
- Storage location: Neon → Supabase
- Query method: Drizzle ORM → Supabase JavaScript client
- Database isolation: Per-Repl → Shared across all Repls

**No security regressions** - All existing security measures are maintained.

---

## 📝 Rollback Plan

If the migration causes issues, you can temporarily rollback:

### Emergency Rollback (Not Recommended)

1. Revert code to previous commit:
   ```bash
   git revert HEAD
   git push
   ```

2. Continue using local Neon handoff_tokens (no cross-Repl SSO)

**Note**: This breaks cross-Repl SSO functionality. Only use in emergency.

### Recommended Approach

Instead of rollback, fix forward:
1. Check Supabase migration ran successfully
2. Verify environment variables are correct
3. Review server logs for specific errors
4. Contact team if stuck

---

## ✅ Deployment Checklist

Use this checklist for each Repl deployment:

- [ ] Pull latest code (`git pull origin main`)
- [ ] Verify environment variables (Secrets tab)
- [ ] Confirm Supabase `handoff_tokens` table exists
- [ ] Restart application
- [ ] Check startup logs for `[HANDOFF] Background cleanup job started`
- [ ] Test handoff token creation
- [ ] Test handoff token redemption
- [ ] Verify background cleanup runs
- [ ] Monitor for 24 hours

---

## 📞 Support

**Questions or Issues?**

1. Check this guide's Troubleshooting section
2. Review server logs for error details
3. Verify Supabase migration in Table Editor
4. Contact team lead with specific error messages

**Related Documentation**:
- `docs/HANDOFF_SSO_INTEGRATION.md` - Technical implementation details
- `supabase-auth-package/migrations/README.md` - Migration instructions
- `replit.md` - Project architecture overview

---

## 🎯 Summary

**What You're Doing**: Updating your Repl to use the shared Supabase database for handoff tokens instead of local Neon storage.

**Why**: Enables true cross-Repl SSO across all 7 deployments (psilyou.com, my.psilyou.com, etc.)

**Steps**: Pull code → Verify secrets → Restart app → Test flow

**Time**: ~5-10 minutes per Repl

**Risk**: Low (migration already tested, no data loss, easy rollback)

---

**Migration completed on psilyou.com**: November 22, 2025 ✅  
**Ready to deploy**: All other Repls 🚀
