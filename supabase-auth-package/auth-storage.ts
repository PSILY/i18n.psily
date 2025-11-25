import { type User, type HandoffToken } from "./schema";
import { supabaseAdmin } from "./supabase-db";

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
      .is('redeemed_at', null)
      .select();
    
    if (error) throw error;
    
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
