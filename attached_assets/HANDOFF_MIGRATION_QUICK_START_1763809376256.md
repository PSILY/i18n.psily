# Handoff Token Migration - Quick Start Guide
## 5-Minute Update for Other Repls

**Status**: ✅ Migration completed on psilyou.com (Nov 22, 2025)  
**Action Required**: Update 6 other Repl deployments

---

## 🚀 Quick Steps (5-10 minutes)

### 1. Pull Latest Code
```bash
git pull origin main
```

### 2. Check Secrets
Open Replit → Tools → Secrets and verify:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `JWT_SECRET`

If missing, copy from psilyou.com Repl.

### 3. Restart App
Click **Stop** then **Run** (or `npm run dev`)

### 4. Verify Startup Logs
Look for this line:
```
[HANDOFF] Background cleanup job started (runs every 5 minutes)
```

✅ **Success!** - You're done.  
❌ **Missing?** - See troubleshooting below.

---

## 🧪 Quick Test

1. Log in on psilyou.com
2. Click "Go to Dashboard" → redirects to my.psilyou.com
3. Should be automatically logged in on my.psilyou.com

If this works, the handoff SSO is functioning correctly! ✅

---

## ⚠️ Common Issues

### "relation handoff_tokens does not exist"
**Fix**: The Supabase migration already ran. Just restart your app.

### Missing startup log "[HANDOFF] Background cleanup..."
**Fix**: 
1. Verify you pulled latest code
2. Check no errors in startup logs
3. Confirm `SUPABASE_SERVICE_ROLE_KEY` secret exists

### "SUPABASE_SERVICE_ROLE_KEY is not defined"
**Fix**: 
1. Go to Replit → Tools → Secrets
2. Copy `SUPABASE_SERVICE_ROLE_KEY` from psilyou.com Repl
3. Restart app

---

## 📋 Deployment Order

Suggested order for updating Repls:

1. ✅ **psilyou.com** - Already completed
2. 🔄 **my.psilyou.com** - Main user dashboard (high priority)
3. 🔄 **admin.psilyou.com** - Admin panel
4. 🔄 **liv.psilyou.com** - Legacy/life planning
5. 🔄 **pdf.psilyou.com** - PDF generation
6. 🔄 **heartbeat.psilyou.com** - Health monitoring
7. 🔄 **i18n.psilyou.com** - Translation service

**Note**: Each Repl is independent. No specific order required.

---

## ✅ Post-Deployment Checklist

- [ ] Code updated (git pull)
- [ ] Secrets verified
- [ ] App restarted
- [ ] Startup log shows handoff cleanup job
- [ ] Test login flow from psilyou.com → this Repl
- [ ] No errors in logs for 10 minutes

---

## 📖 Need More Details?

See full guide: `docs/HANDOFF_TOKEN_MIGRATION_GUIDE.md`

**What Changed**: Handoff tokens moved from local Neon DB → shared Supabase DB  
**Why**: Enables cross-Repl SSO authentication  
**Risk**: Low (already tested, no data loss)

---

## 🆘 Need Help?

1. Check full guide: `docs/HANDOFF_TOKEN_MIGRATION_GUIDE.md`
2. Review startup logs for specific errors
3. Verify Supabase Table Editor has `handoff_tokens` table
4. Contact team with error details

---

**That's it!** The migration is straightforward. Most Repls should update without issues. 🎉
