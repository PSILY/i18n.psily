# Handoff Redemption Endpoint Setup Guide
## Setting Up Local `/api/auth/redeem-handoff/:code` Endpoint on Each Repl

**Purpose**: Enable each Repl (my.psilyou.com, admin.psilyou.com, etc.) to redeem handoff tokens locally without CORS issues.

**Architecture**: Each Repl queries the shared Supabase database directly to redeem handoff tokens, then issues its own JWT for local authentication.

---

## Overview

When a user logs in on psilyou.com and clicks to go to their dashboard:

1. **psilyou.com** creates a handoff token → stored in Supabase `handoff_tokens` table
2. **psilyou.com** redirects to `https://my.psilyou.com?handoff=<code>`
3. **my.psilyou.com** receives the code → calls its LOCAL `/api/auth/redeem-handoff/:code`
4. **my.psilyou.com** validates + redeems the token against Supabase → issues a JWT
5. User is authenticated on my.psilyou.com

Each Repl needs its own redemption endpoint that talks directly to the shared Supabase database.

---

## Prerequisites

Before starting, ensure your Repl has:

1. **Supabase Secrets** (in Replit → Tools → Secrets):
   - `SUPABASE_URL` - Supabase project URL
   - `SUPABASE_ANON_KEY` - Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
   - `JWT_SECRET` - **MUST be the same across all Repls** for token compatibility

2. **Supabase Migration Applied**:
   - `handoff_tokens` table must exist in Supabase
   - See `docs/HANDOFF_TOKEN_MIGRATION_GUIDE.md` for verification steps

---

## Step-by-Step Implementation

### Step 1: Create `supabase-auth-package` Directory

Create the following directory structure:

```
supabase-auth-package/
├── supabase-db.ts      # Supabase client setup
├── auth.ts             # JWT + password utilities
├── auth-storage.ts     # Database operations
└── schema.ts           # Type definitions
```

### Step 2: Create `supabase-auth-package/supabase-db.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL) {
  throw new Error(
    "SUPABASE_URL must be set. Get this from your Supabase project settings.",
  );
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error(
    "SUPABASE_ANON_KEY must be set. Get this from your Supabase project settings.",
  );
}

// Create Supabase client - this respects Row Level Security policies
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Create Supabase service role client - bypasses RLS for backend operations
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);
```

### Step 3: Create `supabase-auth-package/auth.ts`

```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthenticatedUser {
  id: number;
  user_email: string;
  first_name: string;
  last_name: string;
  sub_type: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// Generate JWT token
export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      user_email: user.user_email,
      first_name: user.first_name,
      last_name: user.last_name,
      sub_type: user.sub_type,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Compare password
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT middleware for protected routes
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}
```

### Step 4: Create `supabase-auth-package/schema.ts`

```typescript
import { pgTable, serial, varchar, timestamp, integer, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Supabase Users table for authentication
export const Users = pgTable("Users", {
  id: serial("id").primaryKey(),
  user_email: varchar("user_email", { length: 255 }).unique().notNull(),
  first_name: varchar("first_name", { length: 100 }).notNull(),
  last_name: varchar("last_name", { length: 100 }).notNull(),
  password: text("password").notNull(),
  sub_type: integer("sub_type").default(1).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Handoff Tokens table for secure cross-subdomain SSO
export const HandoffTokens = pgTable("handoff_tokens", {
  id: serial("id").primaryKey(),
  code_hash: varchar("code_hash", { length: 64 }).unique().notNull(),
  user_id: integer("user_id").notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  redeemed_at: timestamp("redeemed_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  ip_address: text("ip_address"),
});

// Type exports
export type User = typeof Users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type HandoffToken = typeof HandoffTokens.$inferSelect;

// Zod schemas
export const insertUserSchema = createInsertSchema(Users).omit({
  id: true,
  password: true,
  created_at: true,
}).extend({
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  user_email: z.string().email(),
  password: z.string().min(1),
});

export type LoginData = z.infer<typeof loginSchema>;
```

### Step 5: Create `supabase-auth-package/auth-storage.ts`

```typescript
import { type User, type HandoffToken } from "./schema";
import { supabaseAdmin } from "./supabase-db";
import { hashPassword } from "./auth";

export class SupabaseAuthStorage {
  // Get user by ID
  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await supabaseAdmin
      .from('Users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return data as User;
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabaseAdmin
      .from('Users')
      .select('*')
      .eq('user_email', email)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return data as User;
  }

  // === Handoff Token Operations ===

  // Get handoff token by code hash
  async getHandoffTokenByCodeHash(codeHash: string): Promise<HandoffToken | undefined> {
    const { data, error } = await supabaseAdmin
      .from('handoff_tokens')
      .select('*')
      .eq('code_hash', codeHash)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return data as HandoffToken;
  }

  // Mark handoff token as redeemed (atomic operation)
  async redeemHandoffToken(tokenId: number): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('handoff_tokens')
      .update({ redeemed_at: new Date().toISOString() })
      .eq('id', tokenId)
      .is('redeemed_at', null) // Only update if not already redeemed
      .select();
    
    if (error) throw error;
    
    // Return true if we updated a row (won the race), false if already redeemed
    return data && data.length > 0;
  }

  // Delete expired handoff tokens (for cleanup job)
  async deleteExpiredHandoffTokens(): Promise<number> {
    const now = new Date().toISOString();
    
    const { data, error } = await supabaseAdmin
      .from('handoff_tokens')
      .delete()
      .lt('expires_at', now)
      .select();
    
    if (error) throw error;
    
    return data?.length || 0;
  }
}

export const supabaseAuth = new SupabaseAuthStorage();
```

### Step 6: Create `server/handoff-auth.ts`

```typescript
import crypto from 'crypto';
import { generateToken, type AuthenticatedUser } from '../supabase-auth-package/auth';
import { supabaseAuth } from '../supabase-auth-package/auth-storage';

const HANDOFF_TTL_SECONDS = 60;
const GRACE_PERIOD_SECONDS = 5;

/**
 * Hash a handoff code using SHA-256
 */
export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Redeem a handoff code and return a JWT token
 * This is the main function needed for receiving Repls
 */
export async function redeemHandoffToken(
  code: string,
  ipAddress?: string
): Promise<{ success: boolean; jwt?: string; error?: string }> {
  const codeHash = hashCode(code);
  
  // Find the handoff token in Supabase
  const token = await supabaseAuth.getHandoffTokenByCodeHash(codeHash);

  if (!token) {
    console.warn(`[HANDOFF] Redemption failed: code not found (IP: ${ipAddress})`);
    return { success: false, error: 'Invalid handoff code' };
  }

  // Check if already redeemed
  if (token.redeemed_at) {
    console.warn(`[HANDOFF] Redemption failed: code already redeemed (user ${token.user_id}, IP: ${ipAddress})`);
    return { success: false, error: 'Handoff code already used' };
  }

  // Check expiration with grace period
  const now = new Date();
  const expiresAt = new Date(token.expires_at);
  const expiresWithGrace = new Date(expiresAt.getTime() + GRACE_PERIOD_SECONDS * 1000);
  
  if (now > expiresWithGrace) {
    console.warn(`[HANDOFF] Redemption failed: code expired (user ${token.user_id}, IP: ${ipAddress})`);
    return { success: false, error: 'Handoff code expired' };
  }

  // Atomically mark as redeemed (prevents race condition double redemption)
  const redeemSuccess = await supabaseAuth.redeemHandoffToken(token.id);

  if (!redeemSuccess) {
    console.warn(`[HANDOFF] Redemption failed: code already redeemed by concurrent request (user ${token.user_id}, IP: ${ipAddress})`);
    return { success: false, error: 'Handoff code already used' };
  }

  // Get user data from Supabase
  const user = await supabaseAuth.getUser(token.user_id);

  if (!user) {
    console.error(`[HANDOFF] Redemption failed: user not found (user ${token.user_id})`);
    return { success: false, error: 'User not found' };
  }

  // Generate JWT for the user
  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    user_email: user.user_email,
    first_name: user.first_name,
    last_name: user.last_name,
    sub_type: user.sub_type,
  };

  const jwt = generateToken(authenticatedUser);

  console.log(`[HANDOFF] Successfully redeemed code for user ${user.id} (${user.user_email})`);

  return { success: true, jwt };
}

/**
 * Clean up expired handoff tokens (optional - can be run on any Repl)
 */
export async function cleanupExpiredHandoffTokens(): Promise<number> {
  const count = await supabaseAuth.deleteExpiredHandoffTokens();
  
  if (count > 0) {
    console.log(`[HANDOFF] Cleaned up ${count} expired handoff tokens`);
  }

  return count;
}
```

### Step 7: Add the Redemption Endpoint to `server/routes.ts`

Add this import at the top of your routes file:

```typescript
import { redeemHandoffToken, cleanupExpiredHandoffTokens } from './handoff-auth';
```

Add the redemption endpoint (you likely already have other routes):

```typescript
// Redeem a handoff code and receive a JWT token
app.get("/api/auth/redeem-handoff/:code",
  async (req, res) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({ message: "Handoff code required" });
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const result = await redeemHandoffToken(code, ipAddress);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ 
        token: result.jwt,
        message: "Handoff code redeemed successfully" 
      });
    } catch (error) {
      console.error("[HANDOFF] Redeem handoff error:", error);
      res.status(500).json({ message: "Failed to redeem handoff code" });
    }
  }
);
```

### Step 8: Add Startup Cleanup Job (Optional but Recommended)

In your `server/index.ts` (or wherever you start the server), add:

```typescript
import { cleanupExpiredHandoffTokens } from './handoff-auth';

// Start background cleanup job for expired handoff tokens
console.log('[HANDOFF] Background cleanup job started (runs every 5 minutes)');
setInterval(async () => {
  try {
    await cleanupExpiredHandoffTokens();
  } catch (error) {
    console.error('[HANDOFF] Cleanup job error:', error);
  }
}, 5 * 60 * 1000); // Run every 5 minutes
```

### Step 9: Handle Incoming Handoff on Frontend

On the receiving Repl's frontend, detect the `?handoff=` query parameter and redeem it:

```typescript
// In your App.tsx or a dedicated auth callback component
import { useEffect } from 'react';
import { useLocation } from 'wouter';

function App() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handoffCode = params.get('handoff');
    
    if (handoffCode) {
      // Redeem the handoff code
      fetch(`/api/auth/redeem-handoff/${handoffCode}`)
        .then(res => res.json())
        .then(data => {
          if (data.token) {
            // Store the JWT
            localStorage.setItem('auth_token', data.token);
            
            // Clean up URL and redirect to dashboard
            window.history.replaceState({}, '', '/');
            setLocation('/dashboard');
          } else {
            console.error('Handoff failed:', data.message);
            setLocation('/login');
          }
        })
        .catch(err => {
          console.error('Handoff error:', err);
          setLocation('/login');
        });
    }
  }, []);

  // ... rest of your app
}
```

---

## Required npm Packages

Ensure these packages are installed:

```bash
npm install @supabase/supabase-js jsonwebtoken bcryptjs
npm install --save-dev @types/jsonwebtoken @types/bcryptjs
```

---

## Environment Variables Checklist

| Variable | Description | Must Match Across Repls? |
|----------|-------------|--------------------------|
| `SUPABASE_URL` | Supabase project URL | ✅ Yes (same database) |
| `SUPABASE_ANON_KEY` | Supabase anon key | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ Yes |
| `JWT_SECRET` | JWT signing secret | ✅ **CRITICAL - Must be identical!** |

---

## Testing the Flow

### Test 1: Manual API Test

```bash
# From psilyou.com (or any Repl that creates tokens)
# Login and get a handoff code, then:

curl "https://my.psilyou.com/api/auth/redeem-handoff/YOUR_HANDOFF_CODE"

# Expected response:
# {"token":"eyJhbGc...","message":"Handoff code redeemed successfully"}
```

### Test 2: End-to-End

1. Login on psilyou.com
2. Click "Go to Dashboard" or your user name
3. Should redirect to my.psilyou.com with `?handoff=...`
4. my.psilyou.com should automatically redeem and log you in
5. Check browser localStorage for `auth_token`

### Test 3: Verify Logs

Check server logs for:
```
[HANDOFF] Successfully redeemed code for user 123 (user@example.com)
```

---

## Troubleshooting

### "Invalid handoff code"
- Token doesn't exist in Supabase
- Check if the token was created on psilyou.com
- Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct

### "Handoff code already used"
- Token was already redeemed (single-use)
- This is expected security behavior
- User needs to re-initiate login flow

### "Handoff code expired"
- Token is older than 60 seconds (+5s grace)
- This is expected security behavior
- User needs to re-initiate login flow

### "User not found"
- User ID in token doesn't exist in Supabase
- Possible data inconsistency - check Supabase Users table

### JWT Token Not Working After Redemption
- **Most likely cause**: JWT_SECRET is different between Repls
- All Repls MUST use the same JWT_SECRET value
- Copy the exact secret from psilyou.com to other Repls

---

## Files to Copy Summary

From this Repl (psilyou.com), copy these files to other Repls:

1. **`supabase-auth-package/`** (entire directory)
   - `supabase-db.ts`
   - `auth.ts`
   - `auth-storage.ts`
   - `schema.ts`

2. **`server/handoff-auth.ts`**

3. **Add to existing `server/routes.ts`**:
   - Import statement
   - `/api/auth/redeem-handoff/:code` endpoint

4. **Add to `server/index.ts`**:
   - Cleanup job (optional)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SHARED SUPABASE DATABASE                       │
│  ┌─────────────┐    ┌───────────────────┐    ┌─────────────────────┐    │
│  │   Users     │    │  handoff_tokens   │    │ Other shared tables │    │
│  └─────────────┘    └───────────────────┘    └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
         ▲                      ▲                        ▲
         │                      │                        │
    ┌────┴────┐           ┌────┴────┐              ┌────┴────┐
    │ CREATE  │           │  READ   │              │  READ   │
    │         │           │ REDEEM  │              │ REDEEM  │
    └────┬────┘           └────┬────┘              └────┬────┘
         │                      │                        │
┌────────┴────────┐   ┌────────┴────────┐    ┌─────────┴─────────┐
│  psilyou.com    │   │ my.psilyou.com  │    │ admin.psilyou.com │
│                 │   │                 │    │                   │
│ • User login    │   │ • Redeem token  │    │ • Redeem token    │
│ • Create token  │   │ • Issue JWT     │    │ • Issue JWT       │
│ • Redirect →    │   │ • User session  │    │ • Admin session   │
└─────────────────┘   └─────────────────┘    └───────────────────┘
         │                      ▲                        ▲
         │                      │                        │
         └──────────────────────┴────────────────────────┘
                    Redirect with ?handoff=CODE
```

---

## Security Notes

- ✅ Handoff codes are hashed (SHA-256) before storage
- ✅ Tokens expire after 60 seconds
- ✅ Single-use enforcement via atomic database update
- ✅ Race condition protection (concurrent redemption blocked)
- ✅ IP address logging for audit
- ✅ Background cleanup removes expired tokens

---

**Document Version**: 1.0  
**Last Updated**: November 25, 2025  
**Applies To**: my.psilyou.com, admin.psilyou.com, liv.psilyou.com, pdf.psilyou.com, heartbeat.psilyou.com, i18n.psilyou.com
