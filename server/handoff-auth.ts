import crypto from 'crypto';
import { generateToken, type AuthenticatedUser } from '../supabase-auth-package/auth';
import { supabaseAuth } from '../supabase-auth-package/auth-storage';

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
 * Clean up expired handoff tokens
 */
export async function cleanupExpiredHandoffTokens(): Promise<number> {
  const count = await supabaseAuth.deleteExpiredHandoffTokens();
  
  if (count > 0) {
    console.log(`[HANDOFF] Cleaned up ${count} expired handoff tokens`);
  }

  return count;
}

// Singleton guard to prevent multiple cleanup job registrations
let cleanupJobStarted = false;

/**
 * Start background cleanup job (singleton - only runs once per process)
 */
export function startCleanupJob(): void {
  if (cleanupJobStarted) {
    return; // Already started, skip
  }
  
  cleanupJobStarted = true;
  console.log('[HANDOFF] Background cleanup job started (runs every 5 minutes)');
  
  setInterval(async () => {
    try {
      await cleanupExpiredHandoffTokens();
    } catch (error) {
      console.error('[HANDOFF] Cleanup job error:', error);
    }
  }, 5 * 60 * 1000);
}
